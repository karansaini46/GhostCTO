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
import {
  generateVettingScorecardRequest,
  getProjectRequest,
  listProjectDocumentsRequest,
} from './project-api';
import { getProjectOptionLabel } from './project-options';
import type { Project, ProjectDocument } from './project-types';
import type {
  VettingDocumentMetadata,
  VettingFlag,
  VettingGenerationInput,
  VettingNextStep,
  VettingOutput,
  VettingRecommendation,
  VettingScoreSection,
} from './vetting-types';

type FormState = {
  founderConcern: string;
  portfolioText: string;
  proposalText: string;
  subjectName: string;
  websiteUrl: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const progressMessages = [
  'Reading the project context, portfolio, and proposal.',
  'Scoring delivery proof, technical depth, clarity, and pricing risk.',
  'Separating green flags from red flags.',
  'Preparing questions, proof requests, and next steps.',
];

const recommendationLabels: Record<VettingRecommendation, string> = {
  avoid: 'Avoid',
  hire: 'Hire',
  interview_with_caution: 'Interview with caution',
  need_more_info: 'Need more proof',
};

const recommendationStyles: Record<VettingRecommendation, string> = {
  avoid: 'border-danger/45 bg-danger/10 text-danger',
  hire: 'border-success/40 bg-success/10 text-success',
  interview_with_caution: 'border-warning/45 bg-warning/10 text-warning',
  need_more_info: 'border-accent/35 bg-accent/10 text-accent',
};

const recommendationTone: Record<
  VettingRecommendation,
  'accent' | 'danger' | 'success' | 'warning'
> = {
  avoid: 'danger',
  hire: 'success',
  interview_with_caution: 'warning',
  need_more_info: 'accent',
};

const scoreTone = (score: number) => {
  if (score <= 4) {
    return 'danger' as const;
  }

  if (score <= 6) {
    return 'warning' as const;
  }

  return 'success' as const;
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

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

const formatBullets = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

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

const defaultFormState = (project: Project | null): FormState => ({
  founderConcern: project?.biggestConcern ?? '',
  portfolioText: '',
  proposalText: '',
  subjectName: '',
  websiteUrl: '',
});

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const validateForm = (state: FormState): FormErrors => {
  const errors: FormErrors = {};
  const subjectName = state.subjectName.trim();
  const websiteUrl = state.websiteUrl.trim();
  const portfolioText = state.portfolioText.trim();
  const proposalText = state.proposalText.trim();
  const founderConcern = state.founderConcern.trim();

  if (subjectName.length < 2) {
    errors.subjectName = 'Add the agency, developer, or technical partner name.';
  }

  if (websiteUrl && !isValidUrl(websiteUrl)) {
    errors.websiteUrl = 'Use a full website or profile URL starting with http:// or https://.';
  }

  if (portfolioText.length < 120 || wordCount(portfolioText) < 18) {
    errors.portfolioText =
      'Paste enough portfolio or profile detail to evaluate relevant proof and delivery history.';
  }

  if (proposalText.length < 120 || wordCount(proposalText) < 18) {
    errors.proposalText =
      'Paste enough proposal detail to evaluate scope, communication, risk, and pricing signals.';
  }

  if (founderConcern.length < 30 || wordCount(founderConcern) < 5) {
    errors.founderConcern = 'Explain the concern or decision you want the scorecard to address.';
  }

  return errors;
};

const toPayload = (state: FormState): VettingGenerationInput => ({
  founderConcern: state.founderConcern.trim(),
  portfolioText: state.portfolioText.trim(),
  proposalText: state.proposalText.trim(),
  subjectName: state.subjectName.trim(),
  websiteUrl: state.websiteUrl.trim() || null,
});

const isVettingOutput = (value: unknown): value is VettingOutput => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const output = value as Partial<VettingOutput>;

  return (
    output.moduleType === 'vetting_scorecard' &&
    typeof output.recommendation === 'string' &&
    typeof output.overallScore === 'number' &&
    typeof output.overallScoreReasoning === 'string' &&
    Boolean(output.finalRecommendation) &&
    Array.isArray(output.criteria) &&
    Array.isArray(output.redFlags) &&
    Array.isArray(output.missingProof) &&
    Array.isArray(output.interviewQuestions) &&
    Array.isArray(output.nextSteps)
  );
};

const isVettingMetadata = (value: unknown): value is VettingDocumentMetadata => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'vettingScorecard' in value;
};

const getDocumentScorecard = (document: ProjectDocument): VettingOutput | null => {
  if (!isVettingMetadata(document.metadata)) {
    return null;
  }

  return isVettingOutput(document.metadata.vettingScorecard)
    ? document.metadata.vettingScorecard
    : null;
};

const getDocumentRequest = (document: ProjectDocument): VettingGenerationInput | null => {
  if (!isVettingMetadata(document.metadata)) {
    return null;
  }

  return document.metadata.request ?? null;
};

const buildQuestionsText = (output: VettingOutput) =>
  output.interviewQuestions
    .map((item, index) =>
      [
        `${index + 1}. ${item.question}`,
        `Why this matters: ${item.reason}`,
        'Strong answer signals:',
        ...item.strongAnswerSignals.map((signal) => `- ${signal}`),
      ].join('\n'),
    )
    .join('\n\n');

const buildProofText = (items: VettingFlag[]) =>
  items
    .map((item, index) =>
      [
        `${index + 1}. ${item.item}`,
        `Evidence gap: ${item.evidence}`,
        `Why it matters: ${item.whyItMatters}`,
      ].join('\n'),
    )
    .join('\n\n');

const buildNextStepsText = (items: VettingNextStep[]) =>
  items
    .map((item, index) =>
      item.reason
        ? `${index + 1}. ${item.action}\nWhy: ${item.reason}`
        : `${index + 1}. ${item.action}`,
    )
    .join('\n\n');

const DetailBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-surface-raised p-4">
    <p className="text-xs uppercase tracking-normal text-muted">{label}</p>
    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text">{value}</p>
  </div>
);

const CopyButton = ({
  label,
  onCopied,
  value,
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

const ScoreBlock = ({
  label,
  score,
  section,
}: {
  label: string;
  score?: number;
  section?: VettingScoreSection;
}) => {
  const resolvedScore = score ?? section?.score ?? 0;
  const tone = scoreTone(resolvedScore);

  return (
    <div className="rounded-md border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold leading-6 text-text">{label}</p>
          {section ? (
            <p className="mt-2 text-sm leading-6 text-muted">{section.reasoning}</p>
          ) : null}
        </div>
        <Badge variant={tone}>{resolvedScore}/10</Badge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
        <div
          className={
            tone === 'danger'
              ? 'h-full rounded-full bg-danger'
              : tone === 'warning'
                ? 'h-full rounded-full bg-warning'
                : 'h-full rounded-full bg-success'
          }
          style={{ width: `${Math.max(0, Math.min(10, resolvedScore)) * 10}%` }}
        />
      </div>
    </div>
  );
};

const FlagList = ({
  items,
  tone,
}: {
  items: VettingFlag[];
  tone: 'danger' | 'success' | 'warning';
}) => (
  <div className="grid gap-3">
    {items.map((item) => (
      <div
        className={
          tone === 'danger'
            ? 'rounded-md border border-danger/40 bg-danger/10 p-4'
            : tone === 'warning'
              ? 'rounded-md border border-warning/40 bg-warning/10 p-4'
              : 'rounded-md border border-success/35 bg-success/10 p-4'
        }
        key={`${item.item}-${item.evidence}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={tone}>
            {tone === 'danger' ? 'Red flag' : tone === 'warning' ? 'Proof needed' : 'Green flag'}
          </Badge>
          <p className="text-sm font-semibold leading-6 text-text">{item.item}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-text">{item.whyItMatters}</p>
        <div className="mt-3 rounded-md border border-current/20 bg-background/20 p-3">
          <p className="text-xs uppercase tracking-normal text-muted">Evidence</p>
          <p className="mt-2 text-sm leading-6 text-text">{item.evidence}</p>
        </div>
      </div>
    ))}
  </div>
);

export const VettingScorecardPage = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { id } = useParams();
  const [activeOutput, setActiveOutput] = useState<VettingOutput | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formState, setFormState] = useState<FormState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progressIndex, setProgressIndex] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [projectResponse, documentsResponse] = await Promise.all([
        getProjectRequest(accessToken, id),
        listProjectDocumentsRequest(accessToken, id, 'vetting_scorecard'),
      ]);

      setProject(projectResponse.project);
      setDocuments(documentsResponse.documents);
      setFormState(defaultFormState(projectResponse.project));
    } catch {
      setError('Unable to load the vetting workspace.');
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
    setActiveOutput(getDocumentScorecard(latestDocument));
  }, [documents, selectedDocumentId]);

  useEffect(() => {
    if (!isGenerating) {
      setProgressIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setProgressIndex((current) => (current + 1) % progressMessages.length);
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
    () => (selectedDocument ? getDocumentScorecard(selectedDocument) : null),
    [selectedDocument],
  );

  const currentOutput = activeOutput ?? selectedDocumentOutput;
  const historyDocuments = documents.filter((document) => document.type === 'vetting_scorecard');

  const updateFormField = useCallback(
    <Field extends keyof FormState>(field: Field, value: FormState[Field]) => {
      setFormState((current) => (current ? { ...current, [field]: value } : current));
      if (formErrors[field]) {
        setFormErrors((current) => ({ ...current, [field]: undefined }));
      }
    },
    [formErrors],
  );

  const handleCopied = useCallback((label: string) => {
    setCopiedLabel(label);
  }, []);

  const handleGenerate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !id || !formState) {
        return;
      }

      const nextErrors = validateForm(formState);
      if (Object.keys(nextErrors).length > 0) {
        setFormErrors(nextErrors);
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const response = await generateVettingScorecardRequest(
          accessToken,
          id,
          toPayload(formState),
        );

        setActiveOutput(response.vettingScorecard);
        setSelectedDocumentId(response.document.id);
        setDocuments((current) => {
          const existing = current.filter((document) => document.id !== response.document.id);
          return [response.document, ...existing];
        });
      } catch {
        setError('Unable to generate this vetting scorecard right now.');
      } finally {
        setIsGenerating(false);
      }
    },
    [accessToken, formState, id],
  );

  const handleSelectDocument = useCallback((document: ProjectDocument) => {
    setSelectedDocumentId(document.id);
    setActiveOutput(getDocumentScorecard(document));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(defaultFormState(project));
    setFormErrors({});
  }, [project]);

  if (isLoading) {
    return <LoadingState label="Loading vetting workspace" />;
  }

  if (error || !project || !formState) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={
            <Button onClick={() => navigate(`/projects/${id ?? ''}`)}>Back to project</Button>
          }
          description={error ?? 'The vetting workspace could not be loaded.'}
          eyebrow="Project workspace"
          title="Agency and Developer Vetting"
        />
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
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => navigate(`/projects/${project.id}`)} variant="secondary">
              Back to project
            </Button>
            {currentOutput ? (
              <>
                <Button
                  onClick={async () => {
                    await copyText(buildQuestionsText(currentOutput));
                    setCopiedLabel('Questions');
                  }}
                  variant="secondary"
                >
                  Copy questions
                </Button>
                <Button
                  onClick={async () => {
                    await copyText(buildNextStepsText(currentOutput.nextSteps));
                    setCopiedLabel('Next steps');
                  }}
                  variant="secondary"
                >
                  Copy next steps
                </Button>
              </>
            ) : null}
          </div>
        }
        description="Evaluate an agency, developer, or technical partner against the project context before you commit budget."
        eyebrow="Project workspace"
        title="Agency and Developer Vetting"
      />

      <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Candidate input</CardTitle>
              <CardDescription>
                Paste the available proof, proposal, and your concern so the scorecard can stay
                grounded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleGenerate}>
                <Input
                  error={formErrors.subjectName}
                  label="Name"
                  onChange={(event) => updateFormField('subjectName', event.target.value)}
                  placeholder="Agency or developer name"
                  value={formState.subjectName}
                />
                <Input
                  error={formErrors.websiteUrl}
                  label="Website or profile URL"
                  onChange={(event) => updateFormField('websiteUrl', event.target.value)}
                  placeholder="https://example.com/profile"
                  value={formState.websiteUrl}
                />
                <Textarea
                  className="min-h-[220px]"
                  error={formErrors.portfolioText}
                  label="Pasted portfolio"
                  onChange={(event) => updateFormField('portfolioText', event.target.value)}
                  placeholder="Paste case studies, profile text, project descriptions, testimonials, links copied as text, technology claims, or relevant background."
                  value={formState.portfolioText}
                />
                <Textarea
                  className="min-h-[240px]"
                  error={formErrors.proposalText}
                  label="Pasted proposal"
                  onChange={(event) => updateFormField('proposalText', event.target.value)}
                  placeholder="Paste the proposal, scope, pricing, milestones, timeline, assumptions, payment terms, and deliverables."
                  value={formState.proposalText}
                />
                <Textarea
                  className="min-h-[140px]"
                  error={formErrors.founderConcern}
                  label="Founder concern"
                  onChange={(event) => updateFormField('founderConcern', event.target.value)}
                  placeholder="What are you worried about before hiring them?"
                  value={formState.founderConcern}
                />
                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button onClick={resetForm} type="button" variant="ghost">
                    Reset
                  </Button>
                  <Button isLoading={isGenerating} type="submit">
                    Generate scorecard
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project context</CardTitle>
              <CardDescription>Saved details used to judge fit and risk.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailBlock label="Project" value={project.name} />
              <DetailBlock
                label="Budget"
                value={getProjectOptionLabel.budgetRange(project.budgetRange)}
              />
              <DetailBlock
                label="Launch timeline"
                value={getProjectOptionLabel.launchTimeline(project.launchTimeline)}
              />
              <DetailBlock
                label="Must-have features"
                value={
                  project.mustHaveFeatures.length
                    ? formatBullets(project.mustHaveFeatures)
                    : 'Not set'
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved scorecards</CardTitle>
              <CardDescription>
                Previous agency and developer reviews for this project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyDocuments.length > 0 ? (
                <div className="grid gap-3">
                  {historyDocuments.map((document) => {
                    const output = getDocumentScorecard(document);
                    const request = getDocumentRequest(document);
                    const isSelected = document.id === selectedDocumentId;

                    return (
                      <div
                        className={`rounded-md border p-4 transition-colors ${
                          isSelected
                            ? 'border-accent/40 bg-accent/10'
                            : 'border-border bg-surface-raised'
                        }`}
                        key={document.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-text">
                                {request?.subjectName ?? document.title}
                              </h3>
                              {output ? (
                                <Badge variant={recommendationTone[output.finalRecommendation]}>
                                  {recommendationLabels[output.finalRecommendation]}
                                </Badge>
                              ) : (
                                <Badge variant={isSelected ? 'accent' : 'neutral'}>
                                  {isSelected ? 'Active' : 'Saved'}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 text-xs uppercase tracking-normal text-muted">
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
                        <div className="mt-3 flex flex-wrap gap-2">
                          {output ? <Badge>{output.overallScore}/10</Badge> : null}
                          {request?.websiteUrl ? <Badge>{request.websiteUrl}</Badge> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  description="Paste the first portfolio and proposal to create a saved hiring scorecard."
                  title="No scorecards yet"
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
                  <p className="text-sm font-medium text-text">Generating scorecard</p>
                  <Badge variant="accent">Working</Badge>
                </div>
                <p className="text-sm leading-6 text-muted">{progressMessages[progressIndex]}</p>
                <div className="grid gap-2">
                  {progressMessages.map((step, index) => (
                    <div
                      className={`rounded-md border px-3 py-2 text-sm leading-6 ${
                        index === progressIndex
                          ? 'border-accent/40 bg-accent/10 text-text'
                          : 'border-border bg-surface-raised text-muted'
                      }`}
                      key={step}
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {copiedLabel ? (
            <div className="flex justify-end">
              <Badge variant="success">{copiedLabel} copied</Badge>
            </div>
          ) : null}

          {currentOutput ? (
            <div className="space-y-6">
              <div
                className={`rounded-lg border p-5 ${recommendationStyles[currentOutput.finalRecommendation]}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-normal opacity-75">
                      Final recommendation
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                      {recommendationLabels[currentOutput.finalRecommendation]}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 opacity-95">
                      {currentOutput.recommendation}
                    </p>
                  </div>
                  <div className="grid min-w-56 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-md border border-current/20 bg-background/20 p-3">
                      <p className="text-xs uppercase tracking-normal opacity-75">Overall score</p>
                      <p className="mt-1 text-3xl font-semibold">{currentOutput.overallScore}/10</p>
                    </div>
                    <div className="rounded-md border border-current/20 bg-background/20 p-3">
                      <p className="text-xs uppercase tracking-normal opacity-75">Red flags</p>
                      <p className="mt-1 text-3xl font-semibold">{currentOutput.redFlags.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Scorecard</CardTitle>
                  <CardDescription>{currentOutput.overallScoreReasoning}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <ScoreBlock label="Technical depth" section={currentOutput.technicalDepthScore} />
                  <ScoreBlock label="Portfolio proof" section={currentOutput.portfolioProofScore} />
                  <ScoreBlock
                    label="Communication clarity"
                    section={currentOutput.communicationClarityScore}
                  />
                  <ScoreBlock label="Pricing risk" section={currentOutput.pricingRiskScore} />
                </CardContent>
              </Card>

              <Card className="border-danger/40 bg-danger/5">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>Red flags</CardTitle>
                      <CardDescription>
                        Treat these as blockers or negotiation points before hiring.
                      </CardDescription>
                    </div>
                    <Badge variant="danger">{currentOutput.redFlags.length} flagged</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <FlagList items={currentOutput.redFlags} tone="danger" />
                </CardContent>
              </Card>

              <Card className="border-accent/30 bg-accent/5">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>Exact next steps</CardTitle>
                      <CardDescription>
                        Do these before you approve work, pay a deposit, or sign a contract.
                      </CardDescription>
                    </div>
                    <CopyButton
                      label="Next steps"
                      onCopied={handleCopied}
                      value={buildNextStepsText(currentOutput.nextSteps)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {currentOutput.nextSteps.map((step, index) => (
                    <div
                      className="rounded-md border border-border bg-surface p-4"
                      key={`${step.action}-${index}`}
                    >
                      <div className="flex gap-3">
                        <Badge variant="accent">{index + 1}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-6 text-text">{step.action}</p>
                          {step.reason ? (
                            <p className="mt-2 text-sm leading-6 text-muted">{step.reason}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Criteria scores</CardTitle>
                    <CardDescription>Detailed scoring behind the recommendation.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {currentOutput.criteria.map((criterion) => (
                      <ScoreBlock
                        key={`${criterion.criterion}-${criterion.score}`}
                        label={criterion.criterion}
                        score={criterion.score}
                        section={{ reasoning: criterion.notes, score: criterion.score }}
                      />
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Strengths</CardTitle>
                    <CardDescription>Positive signals that are worth preserving.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      {currentOutput.strengths.map((strength) => (
                        <div
                          className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm leading-6 text-text"
                          key={strength}
                        >
                          {strength}
                        </div>
                      ))}
                    </div>
                    <FlagList items={currentOutput.greenFlags} tone="success" />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>Questions to ask before hiring</CardTitle>
                      <CardDescription>
                        Use these to test judgment, communication, and proof before making a
                        decision.
                      </CardDescription>
                    </div>
                    <CopyButton
                      label="Questions"
                      onCopied={handleCopied}
                      value={buildQuestionsText(currentOutput)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {currentOutput.interviewQuestions.map((item, index) => (
                    <div
                      className="rounded-md border border-border bg-surface-raised p-4"
                      key={item.question}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <Badge variant="accent">{index + 1}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-6 text-text">
                            {item.question}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted">{item.reason}</p>
                          <div className="mt-3 rounded-md border border-border bg-surface p-3">
                            <p className="text-xs uppercase tracking-normal text-muted">
                              Strong answer signals
                            </p>
                            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-text">
                              {item.strongAnswerSignals.map((signal) => (
                                <li key={signal}>{signal}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-warning/40 bg-warning/5">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>Proof to request</CardTitle>
                      <CardDescription>
                        Ask for this evidence before hiring or increasing commitment.
                      </CardDescription>
                    </div>
                    <CopyButton
                      label="Proof requests"
                      onCopied={handleCopied}
                      value={buildProofText(currentOutput.missingProof)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <FlagList items={currentOutput.missingProof} tone="warning" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Concern summary</CardTitle>
                  <CardDescription>{currentOutput.concernSummary}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  {currentOutput.risks.map((risk) => (
                    <DetailBlock
                      key={risk.risk}
                      label={risk.risk}
                      value={`Impact: ${risk.impact}\nMitigation: ${risk.mitigation}`}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : selectedDocument?.content ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedDocument.title}</CardTitle>
                <CardDescription>
                  {selectedDocument.summary ?? 'Saved vetting scorecard.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[720px] overflow-auto rounded-md border border-border bg-surface-raised p-4 whitespace-pre-wrap text-sm leading-6 text-text">
                  {selectedDocument.content}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              description="Paste a portfolio, proposal, and founder concern to get a scorecard, red flags, proof requests, questions, and exact next steps."
              title="No scorecard generated yet"
            />
          )}
        </div>
      </div>
    </div>
  );
};
