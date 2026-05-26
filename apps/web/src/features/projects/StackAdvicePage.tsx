import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Select,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { GenerationLimitCallout } from './generation-errors';
import { getGenerationErrorMessage, isGenerationLimitError } from './generation-error-utils';
import { budgetRangeOptions, getProjectOptionLabel, technicalLevelOptions } from './project-options';
import {
  generateStackAdviceRequest,
  getProjectRequest,
  listProjectDocumentsRequest,
} from './project-api';
import type { Project, ProjectDocument } from './project-types';
import {
  type StackAdviceCategory,
  type StackAdviceDocumentMetadata,
  type StackAdviceOutput,
  stackAdviceLayerLabels,
} from './stack-advice-types';

type ConstraintOption = {
  label: string;
  value: string;
};

const targetScaleOptions: ConstraintOption[] = [
  { label: 'Pre-launch MVP', value: 'pre_launch' },
  { label: 'Early MVP', value: 'early_mvp' },
  { label: 'Growth-ready', value: 'growth_ready' },
  { label: 'Multi-team', value: 'multi_team' },
];

const complianceSensitivityOptions: ConstraintOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const speedPriorityOptions: ConstraintOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Balanced', value: 'medium' },
  { label: 'High', value: 'high' },
];

const stackAdviceDocumentLabel = 'Stack Advisor';

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

const formatBudgetLabel = (value: string | null) => getProjectOptionLabel.budgetRange(value);
const formatTechnicalLabel = (value: string | null) => getProjectOptionLabel.founderTechnicalLevel(value);

const getOptionLabel = (options: ConstraintOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

const formatConstraintValue = (key: string, value: string) => {
  if (key === 'budgetRange') {
    return formatBudgetLabel(value);
  }

  if (key === 'founderTechnicalLevel') {
    return formatTechnicalLabel(value);
  }

  if (key === 'targetScale') {
    return getOptionLabel(targetScaleOptions, value);
  }

  if (key === 'complianceSensitivity') {
    return getOptionLabel(complianceSensitivityOptions, value);
  }

  if (key === 'speedPriority') {
    return getOptionLabel(speedPriorityOptions, value);
  }

  return formatLabel(value);
};

const formatConstraintKey = (key: string) => {
  if (key === 'budgetRange') {
    return 'Budget';
  }

  if (key === 'founderTechnicalLevel') {
    return 'Technical skill level';
  }

  if (key === 'targetScale') {
    return 'Target scale';
  }

  if (key === 'complianceSensitivity') {
    return 'Compliance sensitivity';
  }

  if (key === 'speedPriority') {
    return 'Speed priority';
  }

  return formatLabel(key);
};

const getStackLayerLabel = (key: string) => stackAdviceLayerLabels[key] ?? formatLabel(key);

const deriveTargetScale = (project: Project | null) => {
  if (!project?.currentStage) {
    return 'early_mvp';
  }

  if (project.currentStage === 'scaling' || project.currentStage === 'launched') {
    return 'multi_team';
  }

  if (project.currentStage === 'mvp' || project.currentStage === 'beta') {
    return 'growth_ready';
  }

  return 'early_mvp';
};

const deriveComplianceSensitivity = (project: Project | null) => {
  const text = `${project?.industry ?? ''} ${project?.targetCustomer ?? ''}`.toLowerCase();
  const sensitiveSignals = ['health', 'medical', 'finance', 'financial', 'payments', 'insurance', 'legal'];

  if (sensitiveSignals.some((signal) => text.includes(signal))) {
    return 'high';
  }

  return 'medium';
};

const deriveSpeedPriority = (project: Project | null) => {
  if (project?.launchTimeline === 'within_4_weeks' || project?.launchTimeline === '4_to_8_weeks') {
    return 'high';
  }

  if (project?.launchTimeline === '8_to_12_weeks') {
    return 'medium';
  }

  return 'medium';
};

const getCategoryTone = (level: StackAdviceCategory['costRiskLevel']) => {
  if (level === 'high') {
    return 'danger' as const;
  }

  if (level === 'medium') {
    return 'warning' as const;
  }

  return 'success' as const;
};

const getComplexityTone = (level: StackAdviceCategory['operationalComplexityLevel']) => {
  if (level === 'high') {
    return 'danger' as const;
  }

  if (level === 'medium') {
    return 'warning' as const;
  }

  return 'success' as const;
};

const isStackAdviceOutput = (value: unknown): value is StackAdviceOutput => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'categories' in value && 'reportMarkdown' in value && 'teamAssumption' in value;
};

const isStackAdviceMetadata = (value: unknown): value is StackAdviceDocumentMetadata => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'stackAdvice' in value;
};

const getDocumentStackAdvice = (document: ProjectDocument): StackAdviceOutput | null => {
  if (!isStackAdviceMetadata(document.metadata) || !isStackAdviceOutput(document.metadata.stackAdvice)) {
    return null;
  }

  return document.metadata.stackAdvice;
};

const getDocumentOverrides = (document: ProjectDocument) => {
  if (!isStackAdviceMetadata(document.metadata)) {
    return null;
  }

  return document.metadata.requestOverrides ?? document.metadata.constraints ?? null;
};

const buildDeveloperBrief = (output: StackAdviceOutput) => {
  const layerLines = output.categories.map(
    (category) => `- ${getStackLayerLabel(category.category)}: ${category.recommendation}`,
  );

  return [
    'Use this stack as the default build plan unless there is a specific reason to change it.',
    `Overall recommendation: ${output.recommendation}`,
    `Team assumption: ${output.teamAssumption}`,
    `Scale view: ${output.scaleView}`,
    '',
    'Layer decisions:',
    ...layerLines,
    '',
    'Focus the first build on the MVP boundaries, keep integrations minimal, and avoid adding extra tools unless they solve a real delivery or compliance problem.',
  ].join('\n');
};

const buildCopyText = (title: string, body: string) => `${title}\n\n${body}`.trim();

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

const toneStyles: Record<'neutral' | 'positive' | 'warning' | 'danger' | 'accent', string> = {
  accent: 'border-accent/30 bg-accent/10 text-accent',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  neutral: 'border-border bg-surface-raised text-text',
  positive: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
};

const stackAdviceProgress = [
  'Reviewing the saved project context and local constraint overrides.',
  'Checking budget, speed, compliance, and scale assumptions.',
  'Drafting layer-by-layer recommendations and tradeoffs.',
  'Validating the final founder-ready brief for clarity.',
];

type StackAdviceConstraintState = {
  budgetRange: string;
  complianceSensitivity: string;
  founderTechnicalLevel: string;
  speedPriority: string;
  targetScale: string;
};

const defaultConstraintState = (project: Project | null): StackAdviceConstraintState => ({
  budgetRange: project?.budgetRange ?? 'not_set',
  complianceSensitivity: deriveComplianceSensitivity(project),
  founderTechnicalLevel: project?.founderTechnicalLevel ?? 'non_technical',
  speedPriority: deriveSpeedPriority(project),
  targetScale: deriveTargetScale(project),
});

const DetailBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text">{value}</p>
  </div>
);

const CopyButton = ({
  label,
  value,
  onCopied,
}: {
  label: string;
  onCopied: (label: string) => void;
  value: string;
}) => (
  <Button
    onClick={async () => {
      await copyText(value);
      onCopied(label);
    }}
    size="sm"
    variant="secondary"
  >
    Copy
  </Button>
);

export const StackAdvicePage = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [activeOutput, setActiveOutput] = useState<StackAdviceOutput | null>(null);
  const [constraintState, setConstraintState] = useState<StackAdviceConstraintState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);

  const loadWorkspace = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setHistoryError(null);
    setLimitMessage(null);

    try {
      const [projectResponse, documentsResponse] = await Promise.all([
        getProjectRequest(accessToken, id),
        listProjectDocumentsRequest(accessToken, id, 'stack_advisor'),
      ]);

      setProject(projectResponse.project);
      setDocuments(documentsResponse.documents);
      setConstraintState(defaultConstraintState(projectResponse.project));
    } catch {
      setError('Unable to load the stack advisor workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!documents.length) {
      return;
    }

    if (selectedDocumentId && documents.some((document) => document.id === selectedDocumentId)) {
      return;
    }

    const latestDocument = documents[0];
    setSelectedDocumentId(latestDocument.id);
    const output = getDocumentStackAdvice(latestDocument);
    if (output) {
      setActiveOutput(output);
    }
  }, [documents, selectedDocumentId]);

  useEffect(() => {
    if (!isGenerating) {
      setProgressIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setProgressIndex((current) => (current + 1) % stackAdviceProgress.length);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    if (!copiedLabel) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedLabel(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedLabel]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  const selectedDocumentOutput = useMemo(
    () => (selectedDocument ? getDocumentStackAdvice(selectedDocument) : null),
    [selectedDocument],
  );

  const currentOutput = activeOutput ?? selectedDocumentOutput;
  const developerBrief = currentOutput ? buildDeveloperBrief(currentOutput) : '';

  const saveCopiedLabel = useCallback((label: string) => {
    setCopiedLabel(label);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!accessToken || !id || !constraintState) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLimitMessage(null);

    try {
      const response = await generateStackAdviceRequest(accessToken, id, constraintState);
      const output = response.stackAdvice as StackAdviceOutput;

      setActiveOutput(output);
      setSelectedDocumentId(response.document.id);
      setDocuments((current) => {
        const existing = current.filter((document) => document.id !== response.document.id);
        return [response.document, ...existing];
      });
    } catch (requestError) {
      const message = getGenerationErrorMessage(
        requestError,
        'Unable to generate stack advice right now.',
      );

      setError(message);
      setLimitMessage(isGenerationLimitError(requestError) ? message : null);
    } finally {
      setIsGenerating(false);
    }
  }, [accessToken, constraintState, id]);

  const handleSelectDocument = useCallback((document: ProjectDocument) => {
    setSelectedDocumentId(document.id);
    const output = getDocumentStackAdvice(document);
    if (output) {
      setActiveOutput(output);
    }
  }, []);

  const resetConstraints = useCallback(() => {
    setConstraintState(defaultConstraintState(project));
  }, [project]);

  if (isLoading) {
    return <LoadingState label="Loading stack advisor" />;
  }

  if (error || !project || !constraintState) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={<Button onClick={() => navigate(`/projects/${id ?? ''}`)}>Back to project</Button>}
          description={error ?? 'The stack advisor workspace could not be loaded.'}
          eyebrow="Project workspace"
          title="Stack Advisor"
        />
        {limitMessage ? (
          <GenerationLimitCallout message={limitMessage} />
        ) : (
          <Card className="border-danger/35 bg-danger/5">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted">
                The workspace may be unavailable, or your account may not have access to the project.
              </p>
              <Button onClick={loadWorkspace} variant="secondary">
                Try again
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const selectedOverrideSummary = selectedDocument ? getDocumentOverrides(selectedDocument) : null;
  const historyDocuments = documents.filter((document) => document.type === 'stack_advisor');
  const topCards = currentOutput?.cards ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => navigate(`/projects/${project.id}`)} variant="secondary">
              Back to project
            </Button>
            <Button isLoading={isGenerating} onClick={handleGenerate}>
              Generate advice
            </Button>
          </div>
        }
        description="Set the constraints you want the recommendation to optimize for, then generate a stack plan you can hand to a developer or vendor."
        eyebrow="Project workspace"
        title="Stack Advisor"
      />

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project constraints</CardTitle>
              <CardDescription>Update the inputs that shape the stack recommendation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailBlock
                label="Current project budget"
                value={formatBudgetLabel(project.budgetRange)}
              />
              <DetailBlock
                label="Current technical level"
                value={formatTechnicalLabel(project.founderTechnicalLevel)}
              />
              <DetailBlock
                label="Current stage"
                value={getProjectOptionLabel.currentStage(project.currentStage)}
              />
              <DetailBlock
                label="Launch timeline"
                value={getProjectOptionLabel.launchTimeline(project.launchTimeline)}
              />
              <DetailBlock
                label="Industry"
                value={project.industry ?? 'Not set'}
              />
              <DetailBlock
                label="Target customer"
                value={project.targetCustomer ?? 'Not set'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generation controls</CardTitle>
              <CardDescription>These settings only affect the next generated recommendation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Select
                label="Budget"
                onChange={(event) =>
                  setConstraintState((current) =>
                    current ? { ...current, budgetRange: event.target.value } : current,
                  )
                }
                value={constraintState.budgetRange}
              >
                {budgetRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Technical skill level"
                onChange={(event) =>
                  setConstraintState((current) =>
                    current ? { ...current, founderTechnicalLevel: event.target.value } : current,
                  )
                }
                value={constraintState.founderTechnicalLevel}
              >
                {technicalLevelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Target scale"
                onChange={(event) =>
                  setConstraintState((current) =>
                    current ? { ...current, targetScale: event.target.value } : current,
                  )
                }
                value={constraintState.targetScale}
              >
                {targetScaleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Compliance sensitivity"
                onChange={(event) =>
                  setConstraintState((current) =>
                    current ? { ...current, complianceSensitivity: event.target.value } : current,
                  )
                }
                value={constraintState.complianceSensitivity}
              >
                {complianceSensitivityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Speed priority"
                onChange={(event) =>
                  setConstraintState((current) =>
                    current ? { ...current, speedPriority: event.target.value } : current,
                  )
                }
                value={constraintState.speedPriority}
              >
                {speedPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </CardContent>
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
              <p className="text-sm leading-6 text-muted">
                Regenerate whenever you adjust the planning assumptions.
              </p>
              <Button onClick={resetConstraints} variant="ghost">
                Reset
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document history</CardTitle>
              <CardDescription>Saved stack advice documents for this project.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyError ? (
                <p className="text-sm leading-6 text-danger">{historyError}</p>
              ) : historyDocuments.length > 0 ? (
                <div className="grid gap-3">
                  {historyDocuments.map((document) => {
                    const isSelected = document.id === selectedDocumentId;
                    const overrides = getDocumentOverrides(document);

                    return (
                      <div
                        className={`
                          rounded-md border p-4 transition-colors
                          ${isSelected ? 'border-accent/40 bg-accent/10' : 'border-border bg-surface-raised'}
                        `}
                        key={document.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold tracking-normal text-text">
                                {stackAdviceDocumentLabel}
                              </h3>
                              <Badge variant={isSelected ? 'accent' : 'neutral'}>
                                {isSelected ? 'Active' : 'Saved'}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                              {formatDate(document.createdAt)} at {formatTime(document.createdAt)}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleSelectDocument(document)}
                            size="sm"
                            variant="secondary"
                          >
                            Open
                          </Button>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted">
                          {document.summary ?? 'No summary available.'}
                        </p>
                        {overrides ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {overrides.budgetRange ? (
                              <Badge>{getProjectOptionLabel.budgetRange(overrides.budgetRange)}</Badge>
                            ) : null}
                            {overrides.founderTechnicalLevel ? (
                              <Badge>
                                {getProjectOptionLabel.founderTechnicalLevel(
                                  overrides.founderTechnicalLevel,
                                )}
                              </Badge>
                            ) : null}
                            {overrides.targetScale ? <Badge>{formatLabel(overrides.targetScale)}</Badge> : null}
                            {overrides.complianceSensitivity ? (
                              <Badge>{formatLabel(overrides.complianceSensitivity)}</Badge>
                            ) : null}
                            {overrides.speedPriority ? <Badge>{formatLabel(overrides.speedPriority)}</Badge> : null}
                          </div>
                        ) : null}
                        {document.content ? (
                          <div className="mt-3">
                            <Button
                              onClick={async () => {
                              await copyText(document.content ?? '');
                              saveCopiedLabel('Saved report');
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              Copy report
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  description="Generate the first stack advice document, then return here to compare versions after you change the constraints."
                  title="No saved advice yet"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {isGenerating ? (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-text">Generating stack advice</p>
                  <Badge variant="accent">Working</Badge>
                </div>
                <p className="text-sm leading-6 text-muted">{stackAdviceProgress[progressIndex]}</p>
                <div className="grid gap-2">
                  {stackAdviceProgress.map((step, index) => (
                    <div
                      className={`
                        rounded-md border px-3 py-2 text-sm leading-6
                        ${
                          index === progressIndex
                            ? 'border-accent/40 bg-accent/10 text-text'
                            : 'border-border bg-surface-raised text-muted'
                        }
                      `}
                      key={step}
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recommendation summary</CardTitle>
              <CardDescription>
                {currentOutput ? 'A clear recommendation you can hand to a developer.' : 'Generate a recommendation to see the stack choices.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {currentOutput ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {topCards.map((card) => (
                      <div
                        className={`rounded-md border p-4 ${toneStyles[card.tone]}`}
                        key={`${card.title}-${card.value}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-normal opacity-70">{card.title}</p>
                            <p className="mt-2 text-lg font-semibold tracking-normal">{card.value}</p>
                          </div>
                          <CopyButton
                            label={card.title}
                            onCopied={saveCopiedLabel}
                            value={buildCopyText(card.title, `${card.value}\n${card.detail ?? ''}`.trim())}
                          />
                        </div>
                        {card.detail ? <p className="mt-3 text-sm leading-6 opacity-90">{card.detail}</p> : null}
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <DetailBlock label="Executive summary" value={currentOutput.executiveSummary} />
                    <DetailBlock label="Team assumption" value={currentOutput.teamAssumption} />
                    <DetailBlock label="Scale view" value={currentOutput.scaleView} />
                    <DetailBlock label="Overall recommendation" value={currentOutput.recommendation} />
                  </div>
                </>
              ) : (
                <EmptyState
                  description="The result will appear here after generation. It will stay readable for a founder and detailed enough for a developer."
                  title="No recommendation generated"
                />
              )}
            </CardContent>
          </Card>

          {currentOutput ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>Layer decisions</CardTitle>
                      <CardDescription>
                        Recommendation cards grouped by the implementation layer.
                      </CardDescription>
                    </div>
                    <Button
                      onClick={async () => {
                        await copyText(buildDeveloperBrief(currentOutput));
                        saveCopiedLabel('Developer brief');
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      Copy brief
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {currentOutput.categories.map((category) => (
                    <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4" key={category.category}>
                      <div className="flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                            {getStackLayerLabel(category.category)}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold tracking-normal text-text">
                            {category.recommendation}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={getCategoryTone(category.costRiskLevel)}>
                            Cost risk: {formatLabel(category.costRiskLevel)}
                          </Badge>
                          <Badge variant={getComplexityTone(category.operationalComplexityLevel)}>
                            Complexity: {formatLabel(category.operationalComplexityLevel)}
                          </Badge>
                          <Button
                            onClick={async () => {
                              const text = [
                                `${getStackLayerLabel(category.category)}: ${category.recommendation}`,
                                '',
                                `Why it fits: ${category.whyItFits}`,
                                `Why not ${category.commonAlternative}: ${category.whyNotCommonAlternative}`,
                                `Cost risk: ${category.costRisk}`,
                                `Operational complexity: ${category.operationalComplexity}`,
                                `Founder explanation: ${category.founderExplanation}`,
                              ].join('\n');
                              await copyText(text);
                              saveCopiedLabel(getStackLayerLabel(category.category));
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <DetailBlock label="Why it fits" value={category.whyItFits} />
                        <DetailBlock
                          label={`Why not ${category.commonAlternative}`}
                          value={category.whyNotCommonAlternative}
                        />
                        <DetailBlock label="Cost risk" value={category.costRisk} />
                        <DetailBlock label="Operational complexity" value={category.operationalComplexity} />
                        <div className="lg:col-span-2">
                          <DetailBlock label="Founder explanation" value={category.founderExplanation} />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>Tradeoff table</CardTitle>
                      <CardDescription>A compact view of the main layer decisions and tradeoffs.</CardDescription>
                    </div>
                    <Button
                      onClick={async () => {
                        const rows = currentOutput.categories
                          .map(
                            (category) =>
                              [
                                getStackLayerLabel(category.category),
                                category.recommendation,
                                category.commonAlternative,
                                category.costRisk,
                                category.operationalComplexity,
                              ].join('\t'),
                          )
                          .join('\n');
                        await copyText(
                          ['Layer\tRecommendation\tAlternative\tCost risk\tOperational complexity', rows].join(
                            '\n',
                          ),
                        );
                        saveCopiedLabel('Tradeoff table');
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      Copy table
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        <th className="border-b border-border px-3 py-3 font-medium">Layer</th>
                        <th className="border-b border-border px-3 py-3 font-medium">Recommendation</th>
                        <th className="border-b border-border px-3 py-3 font-medium">Alternative</th>
                        <th className="border-b border-border px-3 py-3 font-medium">Cost risk</th>
                        <th className="border-b border-border px-3 py-3 font-medium">Operational complexity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentOutput.categories.map((category) => (
                        <tr key={category.category}>
                          <td className="border-b border-border px-3 py-4 align-top text-sm text-text">
                            {getStackLayerLabel(category.category)}
                          </td>
                          <td className="border-b border-border px-3 py-4 align-top text-sm leading-6 text-text">
                            {category.recommendation}
                          </td>
                          <td className="border-b border-border px-3 py-4 align-top text-sm leading-6 text-muted">
                            {category.commonAlternative}
                          </td>
                          <td className="border-b border-border px-3 py-4 align-top text-sm leading-6 text-muted">
                            {category.costRisk}
                          </td>
                          <td className="border-b border-border px-3 py-4 align-top text-sm leading-6 text-muted">
                            {category.operationalComplexity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>What to tell your developer</CardTitle>
                        <CardDescription>
                          A plain-English copy block that keeps the build direction clear.
                        </CardDescription>
                      </div>
                      <Button
                        onClick={async () => {
                          await copyText(developerBrief);
                          saveCopiedLabel('Developer brief');
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap rounded-panel border border-subtle bg-surface-card shadow-sm p-4 text-sm leading-6 text-text">
                      {developerBrief}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>Full markdown report</CardTitle>
                        <CardDescription>
                          The generated report can be copied in one step or scanned in place.
                        </CardDescription>
                      </div>
                      <Button
                        onClick={async () => {
                          await copyText(currentOutput.reportMarkdown);
                          saveCopiedLabel('Full report');
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        Copy report
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Badge variant="accent">Markdown</Badge>
                        {copiedLabel ? <Badge>{copiedLabel} copied</Badge> : null}
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-text">
                        {currentOutput.reportMarkdown}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>Assumptions</CardTitle>
                        <CardDescription>What the recommendation is assuming about the project.</CardDescription>
                      </div>
                      <Button
                        onClick={async () => {
                          const text = currentOutput.assumptions
                            .map((assumption) =>
                              assumption.reason
                                ? `- ${assumption.text} (${assumption.reason})`
                                : `- ${assumption.text}`,
                            )
                            .join('\n');
                          await copyText(text);
                          saveCopiedLabel('Assumptions');
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {currentOutput.assumptions.map((assumption) => (
                      <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4" key={assumption.text}>
                        <p className="text-sm leading-6 text-text">{assumption.text}</p>
                        {assumption.reason ? (
                          <p className="mt-2 text-sm leading-6 text-muted">{assumption.reason}</p>
                        ) : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>Risks and next steps</CardTitle>
                        <CardDescription>What can go wrong and what should happen next.</CardDescription>
                      </div>
                      <Button
                        onClick={async () => {
                          const text = [
                            'Risks:',
                            ...currentOutput.risks.map(
                              (risk) => `- ${risk.risk}: ${risk.impact} / ${risk.mitigation}`,
                            ),
                            '',
                            'Next steps:',
                            ...currentOutput.nextSteps.map((step) =>
                              step.reason ? `- ${step.action} (${step.reason})` : `- ${step.action}`,
                            ),
                          ].join('\n');
                          await copyText(text);
                          saveCopiedLabel('Risks and next steps');
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-3">
                      {currentOutput.risks.map((risk) => (
                        <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4" key={risk.risk}>
                          <p className="text-sm font-medium tracking-normal text-text">{risk.risk}</p>
                          <p className="mt-2 text-sm leading-6 text-muted">{risk.impact}</p>
                          <p className="mt-2 text-sm leading-6 text-muted">{risk.mitigation}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3">
                      {currentOutput.nextSteps.map((step) => (
                        <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4" key={step.action}>
                          <p className="text-sm font-medium tracking-normal text-text">{step.action}</p>
                          {step.reason ? <p className="mt-2 text-sm leading-6 text-muted">{step.reason}</p> : null}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

                      {selectedDocument ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected document details</CardTitle>
                    <CardDescription>
                      {selectedDocument.summary ?? 'Saved stack advice document.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-3">
                    <DetailBlock label="Document title" value={selectedDocument.title} />
                    <DetailBlock label="Status" value={formatLabel(selectedDocument.status)} />
                    <DetailBlock
                      label="Created"
                      value={`${formatDate(selectedDocument.createdAt)} at ${formatTime(selectedDocument.createdAt)}`}
                    />
                    <div className="lg:col-span-3">
                      <DetailBlock
                        label="Selected constraints"
                        value={
                          selectedOverrideSummary
                            ? Object.entries(selectedOverrideSummary)
                                .map(([key, value]) => `${formatConstraintKey(key)}: ${formatConstraintValue(key, String(value))}`)
                                .join('\n')
                            : 'No constraint overrides were saved with this document.'
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <Link className="text-sm font-medium text-accent hover:text-accent/80" to={`/projects/${project.id}`}>
        Back to project
      </Link>
    </div>
  );
};
