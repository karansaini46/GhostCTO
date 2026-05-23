import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  Textarea,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { generateCodeAuditRequest, getProjectRequest, listProjectDocumentsRequest } from './project-api';
import type { Project, ProjectDocument } from './project-types';
import type {
  CodeAuditAction,
  CodeAuditDocumentMetadata,
  CodeAuditFinding,
  CodeAuditGenerationInput,
  CodeAuditOutput,
  CodeAuditRiskLevel,
  CodeAuditSourceMode,
  CodeAuditSeverity,
  CodeAuditQuestion,
} from './code-audit-types';

type FormState = {
  codeSnippet: string;
  repoUrl: string;
  sourceMode: CodeAuditSourceMode;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  codeSnippet: '',
  repoUrl: '',
  sourceMode: 'repo',
};

const riskTone: Record<CodeAuditRiskLevel, 'success' | 'warning' | 'danger'> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

const priorityTone: Record<CodeAuditFinding['priority'], 'neutral' | 'warning' | 'danger'> = {
  p0: 'danger',
  p1: 'danger',
  p2: 'warning',
  p3: 'neutral',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatLabel = (value: string | null | undefined) => {
  if (!value) {
    return 'Not set';
  }

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

const isCodeAuditOutput = (value: unknown): value is CodeAuditOutput => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const output = value as Partial<CodeAuditOutput>;

  return (
    output.moduleType === 'code_audit' &&
    typeof output.reportMarkdown === 'string' &&
    typeof output.executiveSummary === 'string' &&
    typeof output.disclaimer === 'string' &&
    typeof output.recommendation === 'string' &&
    Array.isArray(output.findings) &&
    Array.isArray(output.questionsForDeveloper) &&
    Array.isArray(output.recommendedNextActions) &&
    Array.isArray(output.acceptableAreas)
  );
};

const isCodeAuditMetadata = (value: unknown): value is CodeAuditDocumentMetadata => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'codeAudit' in value;
};

const getDocumentCodeAudit = (document: ProjectDocument): CodeAuditOutput | null => {
  if (!isCodeAuditMetadata(document.metadata) || !isCodeAuditOutput(document.metadata.codeAudit)) {
    return null;
  }

  return document.metadata.codeAudit;
};

const validateForm = (state: FormState): FormErrors => {
  const errors: FormErrors = {};
  const repoUrl = state.repoUrl.trim();
  const codeSnippet = state.codeSnippet.trim();

  if (state.sourceMode === 'repo') {
    if (!repoUrl) {
      errors.repoUrl = 'Paste a public GitHub repository URL.';
    } else if (!/^https:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?\/?$/.test(repoUrl)) {
      errors.repoUrl = 'Use the root public GitHub repository URL.';
    }
  }

  if (state.sourceMode === 'snippet') {
    if (codeSnippet.length < 120 || wordCount(codeSnippet) < 12) {
      errors.codeSnippet = 'Paste enough code to review structure, patterns, and risk.';
    }
  }

  return errors;
};

const toPayload = (state: FormState): CodeAuditGenerationInput => {
  if (state.sourceMode === 'repo') {
    return {
      repoUrl: state.repoUrl.trim(),
    };
  }

  return {
    codeSnippet: state.codeSnippet.trim(),
  };
};

const getSeverityVariant = (severity: CodeAuditSeverity) => {
  if (severity === 'critical' || severity === 'high') {
    return 'danger' as const;
  }

  if (severity === 'medium') {
    return 'warning' as const;
  }

  return 'success' as const;
};

const formatCategoryLabel = (category: CodeAuditFinding['category']) => {
  if (category === 'critical_risk') {
    return 'Critical risk';
  }

  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildReportCopyText = (output: CodeAuditOutput) =>
  [output.executiveSummary, '', output.recommendation, '', output.reportMarkdown].join('\n').trim();

const buildQuestionsCopyText = (questions: CodeAuditQuestion[]) =>
  questions
    .map((question) => `- ${question.question}\n  - ${question.reason}`)
    .join('\n')
    .trim();

const buildActionsCopyText = (actions: CodeAuditAction[]) =>
  actions.map((action) => `- ${action.action}\n  - ${action.reason}`).join('\n').trim();

type FindingGroupProps = {
  items: CodeAuditFinding[];
  title: string;
};

const FindingGroup = ({ items, title }: FindingGroupProps) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>
        {items.length > 0 ? `${items.length} item${items.length === 1 ? '' : 's'}` : 'Nothing material flagged'}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {items.length > 0 ? (
        items.map((item, index) => (
          <div className={index === 0 ? '' : 'border-t border-border pt-4'} key={`${item.title}-${index}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getSeverityVariant(item.severity)}>{item.severity.toUpperCase()}</Badge>
              <Badge variant={priorityTone[item.priority]}>{item.priority.toUpperCase()}</Badge>
              <span className="text-sm font-semibold text-text">{item.title}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-text">{item.explanation}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <p className="text-xs uppercase tracking-normal text-muted">Evidence</p>
                <p className="mt-2 text-sm leading-6 text-text">{item.evidence}</p>
              </div>
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <p className="text-xs uppercase tracking-normal text-muted">Suggested fix</p>
                <p className="mt-2 text-sm leading-6 text-text">{item.suggestedFix}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{formatCategoryLabel(item.category)}</Badge>
              <Badge variant="neutral">Confidence {item.confidenceLevel}</Badge>
              <Badge variant={getSeverityVariant(item.severity)}>{item.impact}</Badge>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm leading-6 text-muted">Nothing material flagged in this section.</p>
      )}
    </CardContent>
  </Card>
);

const CodeAuditPage = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { id } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [generatedDocument, setGeneratedDocument] = useState<ProjectDocument | null>(null);
  const [generatedAudit, setGeneratedAudit] = useState<CodeAuditOutput | null>(null);
  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const loadProject = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [projectResponse, documentsResponse] = await Promise.all([
        getProjectRequest(accessToken, id),
        listProjectDocumentsRequest(accessToken, id, 'code_audit'),
      ]);

      setProject(projectResponse.project);
      setDocuments(documentsResponse.documents);
    } catch {
      setError('Unable to load the code audit workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    if (!accessToken || !id) {
      return;
    }

    loadProject().catch(() => undefined);
  }, [accessToken, id, loadProject]);

  const historyDocuments = useMemo(
    () =>
      documents
        .filter((document) => document.type === 'code_audit')
        .map((document) => ({ audit: getDocumentCodeAudit(document), document }))
        .filter(
          (item): item is { audit: CodeAuditOutput; document: ProjectDocument } => item.audit !== null,
        ),
    [documents],
  );

  const activeDocument = generatedDocument ?? historyDocuments[0]?.document ?? null;
  const activeAudit = generatedAudit ?? historyDocuments[0]?.audit ?? null;

  const handleCopied = useCallback((label: string) => {
    setCopyLabel(label);
    window.setTimeout(() => {
      setCopyLabel((current) => (current === label ? null : current));
    }, 1800);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !id) {
      return;
    }

    const validationErrors = validateForm(formState);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateCodeAuditRequest(accessToken, id, toPayload(formState));
      setGeneratedDocument(response.document);
      setGeneratedAudit(response.codeAudit);
      setDocuments((current) => [response.document, ...current.filter((item) => item.id !== response.document.id)]);
    } catch {
      setError('Unable to generate the code audit right now.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading code audit workspace..." />;
  }

  if (error || !project) {
    return (
      <EmptyState
        action={
          <Button onClick={() => navigate('/')} variant="secondary">
            Back to projects
          </Button>
        }
        description={error ?? 'This workspace is unavailable.'}
        title="Code audit unavailable"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review a codebase before you put more money or trust into the project."
        title="Code Audit"
      />

      <Card>
        <CardHeader>
          <CardTitle>Audit source</CardTitle>
          <CardDescription>Use a public GitHub repository URL or paste the code directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setFormState((current) => ({ ...current, sourceMode: 'repo' }))}
              size="sm"
              variant={formState.sourceMode === 'repo' ? 'primary' : 'secondary'}
            >
              Repository URL
            </Button>
            <Button
              onClick={() => setFormState((current) => ({ ...current, sourceMode: 'snippet' }))}
              size="sm"
              variant={formState.sourceMode === 'snippet' ? 'primary' : 'secondary'}
            >
              Pasted code
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {formState.sourceMode === 'repo' ? (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-normal text-muted" htmlFor="repo-url">
                  Public GitHub repository URL
                </label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/owner/repository"
                  value={formState.repoUrl}
                  onChange={(event) => setFormState((current) => ({ ...current, repoUrl: event.target.value }))}
                />
                {formErrors.repoUrl ? <p className="text-sm text-danger">{formErrors.repoUrl}</p> : null}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-normal text-muted" htmlFor="code-snippet">
                  Pasted code
                </label>
                <Textarea
                  id="code-snippet"
                  className="min-h-[280px]"
                  placeholder="Paste the code you want reviewed."
                  value={formState.codeSnippet}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, codeSnippet: event.target.value }))
                  }
                />
                {formErrors.codeSnippet ? <p className="text-sm text-danger">{formErrors.codeSnippet}</p> : null}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="max-w-2xl text-sm leading-6 text-muted">
                This is an advisory review, not a complete penetration test or security certification.
              </p>
              <Button isLoading={isGenerating} type="submit">
                Run audit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {activeAudit ? (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Executive summary</CardTitle>
                    <CardDescription>{activeAudit.executiveSummary}</CardDescription>
                  </div>
                  <Badge variant={riskTone[activeAudit.overviewRiskLevel]}>
                    {activeAudit.overviewRiskLevel.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-text">{activeAudit.recommendation}</p>
                <div className="rounded-md border border-border bg-surface-raised p-4">
                  <p className="text-xs uppercase tracking-normal text-muted">Disclaimer</p>
                  <p className="mt-2 text-sm leading-6 text-text">{activeAudit.disclaimer}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => {
                      copyText(buildReportCopyText(activeAudit)).catch(() => undefined);
                      handleCopied('report');
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    Copy report
                  </Button>
                  {copyLabel === 'report' ? <span className="text-sm text-success">Copied</span> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Headline signals</CardTitle>
                <CardDescription>Fast scan of the most important signals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeAudit.cards.length > 0 ? (
                  activeAudit.cards.map((card) => (
                    <div className="rounded-md border border-border bg-surface-raised p-3" key={card.title}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-text">{card.title}</span>
                        <Badge
                          variant={
                            card.tone === 'danger'
                              ? 'danger'
                              : card.tone === 'warning'
                                ? 'warning'
                                : card.tone === 'positive'
                                  ? 'success'
                                  : card.tone === 'accent'
                                    ? 'accent'
                                    : 'neutral'
                          }
                        >
                          {card.value}
                        </Badge>
                      </div>
                      {card.detail ? <p className="mt-2 text-sm leading-6 text-muted">{card.detail}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-muted">No headline cards were returned.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FindingGroup items={activeAudit.findings} title="Prioritized findings" />
            <FindingGroup items={activeAudit.criticalRisks} title="Critical risks" />
            <FindingGroup items={activeAudit.securityIssues} title="Security issues" />
            <FindingGroup items={activeAudit.scalabilityIssues} title="Scalability issues" />
            <FindingGroup items={activeAudit.maintainabilityIssues} title="Maintainability issues" />
            <FindingGroup items={activeAudit.rushedWorkSignals} title="Signs of rushed or poor work" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>What is acceptable</CardTitle>
                <CardDescription>Areas that look reasonable for the current stage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeAudit.acceptableAreas.map((item) => (
                  <div className="rounded-md border border-border bg-surface-raised p-3" key={item.area}>
                    <p className="text-sm font-medium text-text">{item.area}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.explanation}</p>
                    <p className="mt-2 text-xs uppercase tracking-normal text-muted">{item.evidence}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Questions for the developer</CardTitle>
                    <CardDescription>Ask these before approving more work.</CardDescription>
                  </div>
                  <Button
                    className="shrink-0"
                    onClick={() => {
                      copyText(buildQuestionsCopyText(activeAudit.questionsForDeveloper)).catch(() => undefined);
                      handleCopied('questions');
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    Copy questions
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeAudit.questionsForDeveloper.map((item) => (
                  <div className="rounded-md border border-border bg-surface-raised p-3" key={item.question}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'neutral'}>
                        {item.priority.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium text-text">{item.question}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.reason}</p>
                  </div>
                ))}
                {copyLabel === 'questions' ? <p className="text-sm text-success">Copied</p> : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Recommended next actions</CardTitle>
                  <CardDescription>What to do before approving more work or spending more budget.</CardDescription>
                </div>
                <Button
                  className="shrink-0"
                  onClick={() => {
                    copyText(buildActionsCopyText(activeAudit.recommendedNextActions)).catch(() => undefined);
                    handleCopied('actions');
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Copy actions
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAudit.recommendedNextActions.map((action) => (
                <div className="rounded-md border border-border bg-surface-raised p-3" key={action.action}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={action.priority === 'high' ? 'danger' : action.priority === 'medium' ? 'warning' : 'neutral'}>
                      {action.priority.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium text-text">{action.action}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{action.reason}</p>
                </div>
              ))}
              {copyLabel === 'actions' ? <p className="text-sm text-success">Copied</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit record</CardTitle>
              <CardDescription>
                {activeDocument
                  ? `${formatDate(activeDocument.createdAt)} at ${formatTime(activeDocument.createdAt)}`
                  : 'No saved record yet'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeDocument ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-border bg-surface-raised p-3">
                      <p className="text-xs uppercase tracking-normal text-muted">Document type</p>
                      <p className="mt-2 text-sm font-medium text-text">{formatLabel(activeDocument.type)}</p>
                    </div>
                    <div className="rounded-md border border-border bg-surface-raised p-3">
                      <p className="text-xs uppercase tracking-normal text-muted">Completed</p>
                      <p className="mt-2 text-sm font-medium text-text">
                        {activeDocument.completedAt ? formatDate(activeDocument.completedAt) : 'Pending'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-surface-raised p-3">
                      <p className="text-xs uppercase tracking-normal text-muted">Summary</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-text">{activeDocument.summary ?? 'Not set'}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted">
                    Saved audit documents stay attached to the project so you can compare earlier and later reviews.
                  </p>
                </>
              ) : (
                <p className="text-sm leading-6 text-muted">Generate an audit to store a document here.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved history</CardTitle>
              <CardDescription>Recent code audits for this project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {historyDocuments.length > 0 ? (
                historyDocuments.map(({ document, audit }) => (
                  <div className="rounded-md border border-border bg-surface-raised p-3" key={document.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-text">{document.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-normal text-muted">
                          {formatDate(document.createdAt)} at {formatTime(document.createdAt)}
                        </p>
                      </div>
                      <Badge variant={riskTone[audit.overviewRiskLevel]}>{audit.overviewRiskLevel.toUpperCase()}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">{audit.executiveSummary}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted">No saved audits yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          description="Paste a repository URL or code snippet to generate a founder-friendly code review."
          title="No audit generated yet"
        />
      )}
    </div>
  );
};

export { CodeAuditPage };
