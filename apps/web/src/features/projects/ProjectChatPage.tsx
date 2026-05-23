import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  LoadingState,
  PageHeader,
  Textarea,
} from '../../components/ui';
import { cn } from '../../lib/cn';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import {
  createProjectChatMessageRequest,
  getProjectRequest,
  listProjectChatMessagesRequest,
  listProjectDocumentsRequest,
} from './project-api';
import { getProjectOptionLabel } from './project-options';
import type {
  Project,
  ProjectChatMessage,
  ProjectChatPagination,
  ProjectDocument,
  ProjectDocumentType,
} from './project-types';

type ContextDocumentType = 'code_audit' | 'rate_validator' | 'roadmap' | 'stack_advisor';

const contextDocumentTypes: ContextDocumentType[] = [
  'roadmap',
  'stack_advisor',
  'rate_validator',
  'code_audit',
];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const documentTypeLabels: Record<string, string> = {
  code_audit: 'Code audit',
  developer_jd: 'Developer JD',
  rate_validator: 'Quote review',
  roadmap: 'Roadmap',
  stack_advisor: 'Stack advice',
  technical_spec: 'Technical spec',
  vetting_scorecard: 'Vetting scorecard',
};

const getDocumentTypeLabel = (type: string) => documentTypeLabels[type] ?? type;

const sortByNewest = (documents: ProjectDocument[]) =>
  [...documents].sort(
    (left, right) =>
      new Date(right.completedAt ?? right.updatedAt).getTime() -
      new Date(left.completedAt ?? left.updatedAt).getTime(),
  );

const getDocumentExcerpt = (document: ProjectDocument | null) => {
  if (!document) {
    return null;
  }

  return document.summary ?? document.content ?? 'Saved without a summary.';
};

const truncate = (value: string, maxLength: number) => {
  const compact = value.replace(/\s+/g, ' ').trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trim()}...`;
};

type ContextCardProps = {
  action?: {
    label: string;
    to: string;
  };
  emptyText: string;
  label: string;
  title: string;
  value: string | null;
};

const ContextCard = ({ action, emptyText, label, title, value }: ContextCardProps) => (
  <div className="rounded-md border border-border bg-surface-raised p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-normal text-muted">{label}</p>
        <h3 className="mt-1 text-sm font-semibold tracking-normal text-text">{title}</h3>
      </div>
      {action ? (
        <Link
          className="shrink-0 text-xs font-medium text-accent hover:text-accent/80"
          to={action.to}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
    <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-muted">
      {value ? truncate(value, 520) : emptyText}
    </p>
  </div>
);

type MessageBubbleProps = {
  message: ProjectChatMessage | { content: string; createdAt: string; id: string; role: 'founder' };
  status?: 'failed' | 'sending';
};

const MessageBubble = ({ message, status }: MessageBubbleProps) => {
  const isFounder = message.role === 'founder';

  return (
    <div className={cn('flex', isFounder ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[min(100%,44rem)] rounded-lg border px-4 py-3 shadow-sm',
          isFounder
            ? 'border-accent/35 bg-accent/10 text-text'
            : 'border-border bg-surface-raised text-text',
          status === 'failed' ? 'border-danger/35 bg-danger/5' : null,
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant={isFounder ? 'accent' : 'neutral'}>
            {isFounder ? 'Founder' : 'Technical co-founder'}
          </Badge>
          <span className="text-xs text-muted">
            {status === 'sending'
              ? 'Sending'
              : status === 'failed'
                ? 'Not sent'
                : formatDateTime(message.createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
          {message.content}
        </p>
      </div>
    </div>
  );
};

const getSuggestedQuestions = (project: Project, documents: ProjectDocument[]) => {
  const hasRoadmap = documents.some((document) => document.type === 'roadmap');
  const hasStackAdvice = documents.some((document) => document.type === 'stack_advisor');
  const hasQuoteOrAudit = documents.some(
    (document) => document.type === 'rate_validator' || document.type === 'code_audit',
  );
  const questions = [
    `What should I build first for ${project.name}?`,
    'Where is the biggest technical risk in this plan?',
    hasStackAdvice
      ? 'Does the current stack advice still fit my budget and timeline?'
      : 'Which stack choices would keep the first build practical?',
    hasRoadmap
      ? 'What should I cut from the first roadmap milestone?'
      : 'What should the first roadmap milestone include?',
    hasQuoteOrAudit
      ? 'What should I ask the developer before I approve the next step?'
      : 'What should I prepare before hiring a developer?',
  ];

  return questions.slice(0, 5);
};

export const ProjectChatPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { accessToken } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [contextDocuments, setContextDocuments] = useState<ProjectDocument[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [outboxMessage, setOutboxMessage] = useState<{
    content: string;
    createdAt: string;
    status: 'failed' | 'sending';
  } | null>(null);
  const [pagination, setPagination] = useState<ProjectChatPagination | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [projectResponse, chatResponse, ...documentResponses] = await Promise.all([
        getProjectRequest(accessToken, id),
        listProjectChatMessagesRequest(accessToken, id),
        ...contextDocumentTypes.map((type) =>
          listProjectDocumentsRequest(accessToken, id, type as ProjectDocumentType),
        ),
      ]);
      const documents = documentResponses.flatMap((response) => response.documents);

      setProject(projectResponse.project);
      setMessages(chatResponse.messages);
      setPagination(chatResponse.pagination);
      setContextDocuments(sortByNewest(documents));
      setSendError(null);
      setOutboxMessage(null);
    } catch {
      setError('Unable to load this chat workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!accessToken || !id) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [projectResponse, chatResponse, ...documentResponses] = await Promise.all([
          getProjectRequest(accessToken, id),
          listProjectChatMessagesRequest(accessToken, id),
          ...contextDocumentTypes.map((type) =>
            listProjectDocumentsRequest(accessToken, id, type as ProjectDocumentType),
          ),
        ]);

        if (!active) {
          return;
        }

        setProject(projectResponse.project);
        setMessages(chatResponse.messages);
        setPagination(chatResponse.pagination);
        setContextDocuments(
          sortByNewest(documentResponses.flatMap((response) => response.documents)),
        );
      } catch {
        if (active) {
          setError('Unable to load this chat workspace.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [accessToken, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, outboxMessage, isSending]);

  const latestDocuments = useMemo(() => {
    const stackAdvice =
      contextDocuments.find((document) => document.type === 'stack_advisor') ??
      project?.documents.find((document) => document.type === 'stack_advisor') ??
      null;
    const roadmap =
      contextDocuments.find((document) => document.type === 'roadmap') ??
      project?.documents.find((document) => document.type === 'roadmap') ??
      null;
    const quoteOrAudit =
      contextDocuments.find(
        (document) => document.type === 'rate_validator' || document.type === 'code_audit',
      ) ??
      project?.documents.find(
        (document) => document.type === 'rate_validator' || document.type === 'code_audit',
      ) ??
      null;

    return {
      quoteOrAudit,
      roadmap,
      stackAdvice,
    };
  }, [contextDocuments, project?.documents]);

  const suggestedQuestions = useMemo(
    () => (project ? getSuggestedQuestions(project, contextDocuments) : []),
    [contextDocuments, project],
  );

  const loadOlderMessages = async () => {
    if (!accessToken || !id || !pagination?.hasNextPage || isLoadingOlder) {
      return;
    }

    setIsLoadingOlder(true);

    try {
      const response = await listProjectChatMessagesRequest(accessToken, id, pagination.page + 1);
      setMessages((current) => [...response.messages, ...current]);
      setPagination(response.pagination);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const submitMessage = async (messageText: string) => {
    if (!accessToken || !id || isSending) {
      return;
    }

    const trimmed = messageText.trim();

    if (!trimmed) {
      return;
    }

    setDraft('');
    setSendError(null);
    setIsSending(true);
    setOutboxMessage({
      content: trimmed,
      createdAt: new Date().toISOString(),
      status: 'sending',
    });

    try {
      const response = await createProjectChatMessageRequest(accessToken, id, trimmed);
      setMessages((current) => [...current, ...response.messages]);
      setOutboxMessage(null);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'The message could not be sent. Review the text and try again.';

      setSendError(message);
      setOutboxMessage({
        content: trimmed,
        createdAt: new Date().toISOString(),
        status: 'failed',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage(draft);
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage(draft);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading chat workspace" />;
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={<Button onClick={() => navigate('/')}>Back to workspace</Button>}
          description={error ?? 'Project not found.'}
          eyebrow="Ongoing CTO Chat"
          title="Unable to load chat"
        />
        <Card className="border-danger/35 bg-danger/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted">
              The project may not exist, or your account may not have access to it.
            </p>
            <Button onClick={loadWorkspace} variant="secondary">
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button onClick={() => navigate(`/projects/${project.id}`)} variant="secondary">
            Project workspace
          </Button>
        }
        description={`Using saved context for ${project.name}: ${project.industry ?? 'industry not set'}, ${getProjectOptionLabel.currentStage(project.currentStage)}, ${getProjectOptionLabel.launchTimeline(project.launchTimeline)}.`}
        eyebrow="Ongoing CTO Chat"
        title="Talk through the next technical decision"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <Card className="min-w-0">
          <CardHeader className="border-b border-border pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Project conversation</CardTitle>
                <CardDescription>
                  Advice is grounded in saved onboarding answers, generated documents, and prior
                  messages.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="accent">{project.name}</Badge>
                <Badge>{messages.length} saved messages</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {pagination?.hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  isLoading={isLoadingOlder}
                  onClick={loadOlderMessages}
                  size="sm"
                  variant="secondary"
                >
                  Load older messages
                </Button>
              </div>
            ) : null}

            <div className="min-h-[26rem] space-y-4">
              {messages.length === 0 && !outboxMessage ? (
                <EmptyState
                  description="Start with the decision in front of you: build order, hiring risk, stack tradeoffs, vendor quotes, or implementation scope."
                  title="No messages yet"
                />
              ) : null}

              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {outboxMessage ? (
                <MessageBubble
                  message={{
                    content: outboxMessage.content,
                    createdAt: outboxMessage.createdAt,
                    id: 'outbox',
                    role: 'founder',
                  }}
                  status={outboxMessage.status}
                />
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            {sendError && outboxMessage?.status === 'failed' ? (
              <div className="rounded-md border border-danger/35 bg-danger/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-danger">{sendError}</p>
                  <Button
                    onClick={() => submitMessage(outboxMessage.content)}
                    size="sm"
                    variant="secondary"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : null}

            {suggestedQuestions.length > 0 ? (
              <div className="space-y-3 border-t border-border pt-5">
                <p className="text-sm font-medium tracking-normal text-text">Suggested questions</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      className="rounded-full border border-border bg-surface-raised px-3 py-2 text-left text-sm leading-5 text-muted transition-colors hover:border-accent/35 hover:text-text"
                      key={question}
                      onClick={() => setDraft(question)}
                      type="button"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <form className="space-y-3 border-t border-border pt-5" onSubmit={handleSubmit}>
              <Textarea
                className="min-h-24 resize-none"
                disabled={isSending}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Ask about scope, stack, hiring, vendor risk, or the next build decision."
                value={draft}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted">
                  Connected to {project.answers.length} saved answers and{' '}
                  {contextDocuments.length || project.documents.length} recent documents.
                </p>
                <Button disabled={!draft.trim()} isLoading={isSending} type="submit">
                  Send
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Project memory</CardTitle>
              <CardDescription>Current context used for this conversation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ContextCard
                label="Project idea"
                title={project.name}
                value={[
                  project.ideaSummary,
                  project.targetCustomer ? `Target customer: ${project.targetCustomer}` : null,
                  project.biggestConcern ? `Main concern: ${project.biggestConcern}` : null,
                ]
                  .filter(Boolean)
                  .join('\n\n')}
                emptyText="The project summary has not been saved yet."
              />
              <ContextCard
                action={{ label: 'Open', to: `/projects/${project.id}/stack-advice` }}
                emptyText="No stack advice has been generated yet."
                label="Current stack advice"
                title={latestDocuments.stackAdvice?.title ?? 'Stack guidance'}
                value={getDocumentExcerpt(latestDocuments.stackAdvice)}
              />
              <ContextCard
                action={{ label: 'Open', to: `/projects/${project.id}` }}
                emptyText="No roadmap has been generated yet."
                label="Latest roadmap"
                title={latestDocuments.roadmap?.title ?? 'Execution plan'}
                value={getDocumentExcerpt(latestDocuments.roadmap)}
              />
              <ContextCard
                action={
                  latestDocuments.quoteOrAudit
                    ? {
                        label: 'Open',
                        to:
                          latestDocuments.quoteOrAudit.type === 'code_audit'
                            ? `/projects/${project.id}/code-audit`
                            : `/projects/${project.id}/rate-validator`,
                      }
                    : undefined
                }
                emptyText="No quote review or code audit is available yet."
                label="Latest quote or audit"
                title={
                  latestDocuments.quoteOrAudit
                    ? `${getDocumentTypeLabel(latestDocuments.quoteOrAudit.type)}: ${latestDocuments.quoteOrAudit.title}`
                    : 'Delivery risk review'
                }
                value={getDocumentExcerpt(latestDocuments.quoteOrAudit)}
              />
              <div className="rounded-md border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-normal text-muted">Workspace facts</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{getProjectOptionLabel.budgetRange(project.budgetRange)}</Badge>
                  <Badge>
                    {getProjectOptionLabel.founderTechnicalLevel(project.founderTechnicalLevel)}
                  </Badge>
                  <Badge>{formatDate(project.updatedAt)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};
