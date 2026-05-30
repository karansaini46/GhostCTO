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
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  Textarea,
  ModulePageShell,
  ModuleInputPanel,
  ModuleOutputPanel,
  HelpfulEmptyState,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { DocumentFeedbackPanel } from './DocumentFeedbackPanel';
import { GenerationLimitCallout } from './generation-errors';
import { getGenerationErrorMessage, isGenerationLimitError } from './generation-error-utils';
import {
  generateCodeAuditRequest,
  getProjectRequest,
  listProjectDocumentsRequest,
} from './project-api';
import type { Project, ProjectDocument, ProjectDocumentFeedback } from './project-types';
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
  actions
    .map((action) => `- ${action.action}\n  - ${action.reason}`)
    .join('\n')
    .trim();

const downloadTextFile = (
  filename: string,
  content: string,
  mimeType = 'text/markdown;charset=utf-8',
) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noreferrer';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

const severityOrder: CodeAuditSeverity[] = ['critical', 'high', 'medium', 'low'];

const severityLabels: Record<CodeAuditSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  low: 'Low',
  medium: 'Medium',
};

const severityDescriptions: Record<CodeAuditSeverity, string> = {
  critical: 'Blocks trust or continuation until fixed.',
  high: 'Can create meaningful delivery, security, or cost risk.',
  medium: 'Needs attention before the project grows further.',
  low: 'Useful context, but not urgent.',
};

const getSeverityItems = (items: CodeAuditFinding[], severity: CodeAuditSeverity) =>
  items.filter((item) => item.severity === severity);

const buildFindingQuestion = (item: CodeAuditFinding) => {
  if (item.category === 'security') {
    return `Show me exactly how you would remove ${item.title.toLowerCase()} risk before the next release.`;
  }

  if (item.category === 'scalability') {
    return `What would you change in the next sprint to make ${item.title.toLowerCase()} safe at higher usage?`;
  }

  if (item.category === 'maintainability') {
    return `How would you make ${item.title.toLowerCase()} easier for another developer to own?`;
  }

  if (item.category === 'delivery_risk') {
    return `What is the concrete plan to close ${item.title.toLowerCase()} without adding hidden scope?`;
  }

  return `What specific change would you make to address ${item.title.toLowerCase()}?`;
};

type FindingGroupProps = {
  items: CodeAuditFinding[];
  title: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  subtitle: string;
};

const FindingGroup = ({ items, subtitle, title, tone }: FindingGroupProps) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
        <Badge variant={tone}>
          {items.length > 0 ? `${items.length} finding${items.length === 1 ? '' : 's'}` : 'Clear'}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {items.length > 0 ? (
        items.map((item, index) => (
          <div
            className={index === 0 ? '' : 'border-t border-border pt-4'}
            key={`${item.title}-${index}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getSeverityVariant(item.severity)}>
                {severityLabels[item.severity]}
              </Badge>
              <Badge variant={priorityTone[item.priority]}>{item.priority.toUpperCase()}</Badge>
              <Badge variant="neutral">{formatCategoryLabel(item.category)}</Badge>
              <Badge variant="neutral">Confidence {item.confidenceLevel}</Badge>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-text">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-text">{item.explanation}</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Why the founder should care
                </p>
                <p className="mt-2 text-sm leading-6 text-text">{item.impact}</p>
              </div>
              <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Suggested fix
                </p>
                <p className="mt-2 text-sm leading-6 text-text">{item.suggestedFix}</p>
              </div>
            </div>
            <div className="mt-3 rounded-panel border border-subtle bg-surface-card shadow-sm p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Evidence
              </p>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-text">
                {item.evidence}
              </pre>
            </div>
            <div className="mt-3 rounded-panel border border-subtle bg-surface-card shadow-sm p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                What to ask the developer
              </p>
              <p className="mt-2 text-sm leading-6 text-text">{buildFindingQuestion(item)}</p>
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [generatedDocument, setGeneratedDocument] = useState<ProjectDocument | null>(null);
  const [generatedAudit, setGeneratedAudit] = useState<CodeAuditOutput | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const loadProject = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setGenerationError(null);
    setLimitMessage(null);

    try {
      const [projectResponse, documentsResponse] = await Promise.all([
        getProjectRequest(accessToken, id),
        listProjectDocumentsRequest(accessToken, id, 'code_audit'),
      ]);

      setProject(projectResponse.project);
      setDocuments(documentsResponse.documents);
    } catch {
      setLoadError('Unable to load the code audit workspace.');
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
          (item): item is { audit: CodeAuditOutput; document: ProjectDocument } =>
            item.audit !== null,
        ),
    [documents],
  );

  const activeDocument =
    documents.find((doc) => doc.id === selectedDocumentId) ??
    generatedDocument ??
    historyDocuments[0]?.document ??
    null;

  const activeAudit = useMemo(() => {
    if (!activeDocument) return null;
    return getDocumentCodeAudit(activeDocument);
  }, [activeDocument]);
  const severityGroups = useMemo(
    () =>
      severityOrder.map((severity) => ({
        items: activeAudit ? getSeverityItems(activeAudit.findings, severity) : [],
        severity,
      })),
    [activeAudit],
  );

  const handleCopied = useCallback((label: string) => {
    setCopyLabel(label);
    window.setTimeout(() => {
      setCopyLabel((current) => (current === label ? null : current));
    }, 1800);
  }, []);

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!accessToken || !id) {
      return;
    }

    const validationErrors = validateForm(formState);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setLimitMessage(null);

    try {
      const response = await generateCodeAuditRequest(accessToken, id, toPayload(formState));
      setGeneratedDocument(response.document);
      setGeneratedAudit(response.codeAudit);
      setDocuments((current) => [
        response.document,
        ...current.filter((item) => item.id !== response.document.id),
      ]);
    } catch (requestError) {
      const message = getGenerationErrorMessage(
        requestError,
        'Unable to generate the code audit right now.',
      );

      setGenerationError(message);
      setLimitMessage(isGenerationLimitError(requestError) ? message : null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedbackSaved = useCallback((feedback: ProjectDocumentFeedback) => {
    setGeneratedDocument((current) =>
      current?.id === feedback.documentId ? { ...current, feedback } : current,
    );
    setDocuments((current) =>
      current.map((document) =>
        document.id === feedback.documentId ? { ...document, feedback } : document,
      ),
    );
  }, []);

  const handleExportReport = useCallback(() => {
    if (!activeAudit) {
      return;
    }

    const exportSections = [
      `# Code Audit`,
      '',
      `## Executive summary`,
      activeAudit.executiveSummary,
      '',
      `## Recommendation`,
      activeAudit.recommendation,
      '',
      `## Disclaimer`,
      activeAudit.disclaimer,
      '',
      activeAudit.reportMarkdown,
    ]
      .filter(Boolean)
      .join('\n');

    const fileName = `code-audit-${id ?? 'project'}.md`;

    downloadTextFile(fileName, exportSections);
    handleCopied('export');
  }, [activeAudit, handleCopied, id]);

  if (isLoading) {
    return <LoadingState label="Loading code audit workspace..." />;
  }

  if (loadError || !project) {
    return (
      <EmptyState
        action={
          <Button onClick={() => navigate('/')} variant="secondary">
            Back to projects
          </Button>
        }
        description={loadError ?? 'This workspace is unavailable.'}
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

      {generationError && !limitMessage ? (
        <ErrorState
          action={
            <Button onClick={() => setGenerationError(null)} variant="secondary" size="sm">
              Dismiss
            </Button>
          }
          description="Your audit inputs have been preserved. Please check the error details and try again."
          title={generationError}
        />
      ) : null}
      {limitMessage ? <GenerationLimitCallout message={limitMessage} /> : null}

      <ModulePageShell>
        <ModuleInputPanel colSpan="col-span-12 xl:col-span-4">
          <Card>
        <CardHeader>
          <CardTitle>Audit source</CardTitle>
          <CardDescription>
            Use a public GitHub repository URL or paste the code directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="inline-flex rounded-md bg-surface p-1 border border-border">
            <button
              onClick={() => setFormState((current) => ({ ...current, sourceMode: 'repo' }))}
              className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                formState.sourceMode === 'repo'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-secondary hover:text-text'
              }`}
              type="button"
            >
              Repository URL
            </button>
            <button
              onClick={() => setFormState((current) => ({ ...current, sourceMode: 'snippet' }))}
              className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                formState.sourceMode === 'snippet'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-secondary hover:text-text'
              }`}
              type="button"
            >
              Pasted code
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {formState.sourceMode === 'repo' ? (
              <div className="space-y-2">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-muted"
                  htmlFor="repo-url"
                >
                  Public GitHub repository URL
                </label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/owner/repository"
                  value={formState.repoUrl}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, repoUrl: event.target.value }))
                  }
                />
                {formErrors.repoUrl ? (
                  <p className="text-sm text-danger">{formErrors.repoUrl}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-muted"
                  htmlFor="code-snippet"
                >
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
                {formErrors.codeSnippet ? (
                  <p className="text-sm text-danger">{formErrors.codeSnippet}</p>
                ) : null}
              </div>
            )}

            <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Review limits
              </p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-text">
                <li>
                  Public GitHub repositories only. Private repositories are not accessible in this
                  version.
                </li>
                <li>
                  This is an advisory review, not a penetration test, certification, or code
                  warranty.
                </li>
                <li>
                  Evidence is drawn from the supplied source only. Missing context will be called
                  out explicitly.
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-2xl text-sm leading-6 text-muted">
                Use the result to decide whether to keep investing, slow down, or ask for a clearer
                fix plan.
              </p>
              <Button isLoading={isGenerating} type="submit">
                Run audit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved history</CardTitle>
          <CardDescription>Recent code audits for this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyDocuments.length > 0 ? (
            historyDocuments.map(({ document, audit }) => {
              const isActive = document.id === activeDocument?.id;
              return (
                <div
                  className={`rounded-panel border p-3 shadow-sm transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-subtle bg-surface-card hover:border-accent/35'
                  }`}
                  key={document.id}
                  onClick={() => setSelectedDocumentId(document.id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text">{document.title}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        {formatDate(document.createdAt)} at {formatTime(document.createdAt)}
                      </p>
                    </div>
                    <Badge variant={riskTone[audit.overviewRiskLevel]}>
                      {audit.overviewRiskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{audit.executiveSummary}</p>
                </div>
              );
            })
          ) : (
            <p className="text-sm leading-6 text-muted">No saved audits yet.</p>
          )}
        </CardContent>
      </Card>
    </ModuleInputPanel>

    <ModuleOutputPanel colSpan="col-span-12 xl:col-span-8">
      {activeAudit ? (
        <div className="space-y-6">
          {activeDocument ? (
            <DocumentFeedbackPanel
              accessToken={accessToken}
              document={activeDocument}
              onFeedbackSaved={handleFeedbackSaved}
              projectId={project.id}
            />
          ) : null}

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
                <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Disclaimer
                  </p>
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
                  <Button onClick={handleExportReport} size="sm" variant="secondary">
                    Export report
                  </Button>
                  {copyLabel === 'report' ? (
                    <span className="text-sm text-success">Copied</span>
                  ) : null}
                  {copyLabel === 'export' ? (
                    <span className="text-sm text-success">Exported</span>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit snapshot</CardTitle>
                <CardDescription>
                  At-a-glance view of the report structure and signal strength.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {severityOrder.map((severity) => {
                    const count = getSeverityItems(activeAudit.findings, severity).length;

                    return (
                      <div
                        className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3"
                        key={severity}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-text">
                            {severityLabels[severity]}
                          </span>
                          <Badge variant={getSeverityVariant(severity)}>{count}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {severityDescriptions[severity]}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {activeAudit.cards.length > 0 ? (
                  activeAudit.cards.map((card) => (
                    <div
                      className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3"
                      key={card.title}
                    >
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
                      {card.detail ? (
                        <p className="mt-2 text-sm leading-6 text-muted">{card.detail}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-muted">No headline cards were returned.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FindingGroup
              items={severityGroups.find(({ severity }) => severity === 'critical')?.items ?? []}
              subtitle="Stop-the-line issues that should be resolved before more budget goes in."
              title="Critical"
              tone="danger"
            />
            <FindingGroup
              items={severityGroups.find(({ severity }) => severity === 'high')?.items ?? []}
              subtitle="Material issues that can increase cost, delay delivery, or expose risk."
              title="High"
              tone="danger"
            />
            <FindingGroup
              items={severityGroups.find(({ severity }) => severity === 'medium')?.items ?? []}
              subtitle="Problems that should be tracked before the project grows further."
              title="Medium"
              tone="warning"
            />
            <FindingGroup
              items={severityGroups.find(({ severity }) => severity === 'low')?.items ?? []}
              subtitle="Lower-priority issues that are useful to note but not urgent."
              title="Low"
              tone="success"
            />
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Good signs</CardTitle>
                <CardDescription>Areas that look reasonable and should be kept.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeAudit.acceptableAreas.length > 0 ? (
                  activeAudit.acceptableAreas.map((item) => (
                    <div
                      className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3"
                      key={item.area}
                    >
                      <p className="text-sm font-medium text-text">{item.area}</p>
                      <p className="mt-2 text-sm leading-6 text-text">{item.explanation}</p>
                      <div className="mt-3 rounded-md border border-border bg-surface p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                          Evidence
                        </p>
                        <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-text">
                          {item.evidence}
                        </pre>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-muted">
                    Nothing material stood out as a good sign.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
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
                      copyText(buildQuestionsCopyText(activeAudit.questionsForDeveloper)).catch(
                        () => undefined,
                      );
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
                  <div
                    className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3"
                    key={item.question}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          item.priority === 'high'
                            ? 'danger'
                            : item.priority === 'medium'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
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
                  <CardDescription>
                    What to do before approving more work or spending more budget.
                  </CardDescription>
                </div>
                <Button
                  className="shrink-0"
                  onClick={() => {
                    copyText(buildActionsCopyText(activeAudit.recommendedNextActions)).catch(
                      () => undefined,
                    );
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
                <div
                  className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3"
                  key={action.action}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        action.priority === 'high'
                          ? 'danger'
                          : action.priority === 'medium'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
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
                    <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Document type
                      </p>
                      <p className="mt-2 text-sm font-medium text-text">
                        {formatLabel(activeDocument.type)}
                      </p>
                    </div>
                    <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Completed
                      </p>
                      <p className="mt-2 text-sm font-medium text-text">
                        {activeDocument.completedAt
                          ? formatDate(activeDocument.completedAt)
                          : 'Pending'}
                      </p>
                    </div>
                    <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Summary
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-text">
                        {activeDocument.summary ?? 'Not set'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted">
                    Saved audit documents stay attached to the project so you can compare earlier
                    and later reviews.
                  </p>
                </>
              ) : (
                <p className="text-sm leading-6 text-muted">
                  Generate an audit to store a document here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <HelpfulEmptyState
              action={
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted">Ready to run an audit?</p>
                  <Button isLoading={isGenerating} onClick={() => handleSubmit()}>
                    Run audit
                  </Button>
                </div>
              }
              description="An advisory technical scan identifying security gaps, scalability limits, and setup concerns."
              previewSections={[
                {
                  desc: 'A high-level overview highlighting key codebase strengths, critical warnings, and next steps.',
                  title: 'Executive Summary',
                },
                {
                  desc: 'File structure stats, primary languages, dependency health indicators, and setup ease.',
                  title: 'Audit Snapshot',
                },
                {
                  desc: 'Severe, High, Medium, and Low severity issues with evidence snippets and developer remedies.',
                  title: 'Vulnerability Findings',
                },
                {
                  desc: 'Copy-pasteable checklist of prioritized action items you can hand to developers to patch the code.',
                  title: 'Remediation Actions',
                },
              ]}
              title="Expected Code Audit Output"
              whatItDoes="Reviews your public GitHub repository or pasted source code, pointing out technical debt, configuration errors, security holes, and structural risks in plain co-founder English."
              whatToProvide={[
                'Public GitHub repository URL (private repos not supported)',
                'Or pasted code snippets of your main controller, config, or routing files',
              ]}
              whatYouGet={[
                'Vulnerability Audit: Line-by-line flags for secrets leakage, bad authentication, SQLi risk',
                'Scalability & Hygiene Checks: Database queries layout, indexing gaps, hardcoding warnings',
                'Actionable Remediation: Direct instructions on how to patch the problems',
                'Developer Questions: Targeted questions to ask your team to verify setup safety',
              ]}
            />
          )}
        </ModuleOutputPanel>
      </ModulePageShell>
    </div>
  );
};

export { CodeAuditPage };
