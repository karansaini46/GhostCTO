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
  Select,
  Textarea,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import {
  generateRateValidationRequest,
  getProjectRequest,
  listProjectDocumentsRequest,
} from './project-api';
import { getProjectOptionLabel } from './project-options';
import type { Project, ProjectDocument } from './project-types';
import type {
  RateValidatorConfidence,
  RateValidatorDeveloperType,
  RateValidatorDocumentMetadata,
  RateValidatorGenerationInput,
  RateValidatorOutput,
  RateValidatorUrgency,
  RateValidatorVerdict,
} from './rate-validator-types';

type SelectOption<Value extends string> = {
  label: string;
  value: Value;
};

type FormState = {
  countryMarket: string;
  currency: string;
  deadline: string;
  developerType: RateValidatorDeveloperType;
  projectUrgency: RateValidatorUrgency;
  proposalText: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const developerTypeOptions: Array<SelectOption<RateValidatorDeveloperType>> = [
  { label: 'Not sure', value: 'unknown' },
  { label: 'Freelancer', value: 'freelancer' },
  { label: 'Agency', value: 'agency' },
];

const urgencyOptions: Array<SelectOption<RateValidatorUrgency>> = [
  { label: 'Immediate', value: 'urgent' },
  { label: 'Within 30 days', value: 'within_30_days' },
  { label: 'Within 60 days', value: 'within_60_days' },
  { label: 'Flexible', value: 'flexible' },
];

const progressMessages = [
  'Reading the proposal and project context.',
  'Parsing scope, deliverables, timeline, and price terms.',
  'Checking vague wording, timeline risk, and contract gaps.',
  'Preparing questions and negotiation language.',
];

const verdictLabels: Record<RateValidatorVerdict, string> = {
  fair: 'Fair',
  overpriced: 'Overpriced',
  risky: 'Risky',
  under_scoped: 'Under-scoped',
  unrealistic: 'Unrealistic',
};

const verdictStyles: Record<RateValidatorVerdict, string> = {
  fair: 'border-success/35 bg-success/10 text-success',
  overpriced: 'border-danger/35 bg-danger/10 text-danger',
  risky: 'border-warning/40 bg-warning/10 text-warning',
  under_scoped: 'border-warning/40 bg-warning/10 text-warning',
  unrealistic: 'border-danger/35 bg-danger/10 text-danger',
};

const confidenceTone: Record<RateValidatorConfidence, 'success' | 'warning' | 'danger'> = {
  high: 'success',
  low: 'danger',
  medium: 'warning',
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

const formatBullets = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

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

const getOptionLabel = <Value extends string>(options: Array<SelectOption<Value>>, value: Value) =>
  options.find((option) => option.value === value)?.label ?? formatLabel(value);

const deriveUrgency = (project: Project | null): RateValidatorUrgency => {
  if (project?.launchTimeline === 'within_4_weeks') {
    return 'urgent';
  }

  if (project?.launchTimeline === '4_to_8_weeks') {
    return 'within_30_days';
  }

  if (project?.launchTimeline === '8_to_12_weeks') {
    return 'within_60_days';
  }

  return 'flexible';
};

const defaultFormState = (project: Project | null): FormState => ({
  countryMarket: '',
  currency: '',
  deadline: '',
  developerType: 'unknown',
  projectUrgency: deriveUrgency(project),
  proposalText: '',
});

const validateForm = (state: FormState): FormErrors => {
  const errors: FormErrors = {};
  const proposal = state.proposalText.trim();
  const currency = state.currency.trim();

  if (proposal.length < 120 || wordCount(proposal) < 18) {
    errors.proposalText =
      'Paste enough proposal detail to evaluate scope, pricing, deliverables, and timeline.';
  }

  if (currency && !/^[A-Za-z]{3}$/.test(currency)) {
    errors.currency = 'Use a three-letter currency code such as USD, INR, EUR, or GBP.';
  }

  return errors;
};

const toPayload = (state: FormState): RateValidatorGenerationInput => ({
  countryMarket: state.countryMarket.trim() || null,
  currency: state.currency.trim() ? state.currency.trim().toUpperCase() : null,
  deadline: state.deadline.trim() || null,
  developerType: state.developerType,
  projectUrgency: state.projectUrgency,
  proposalText: state.proposalText.trim(),
});

const isRateValidatorOutput = (value: unknown): value is RateValidatorOutput => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const output = value as Partial<RateValidatorOutput>;

  return (
    output.moduleType === 'quote_analysis' &&
    typeof output.reportMarkdown === 'string' &&
    typeof output.riskScore === 'number' &&
    Boolean(output.priceFairnessVerdict) &&
    Boolean(output.timelineRealism) &&
    Array.isArray(output.missingDeliverables) &&
    Array.isArray(output.questionsToAskDeveloper) &&
    typeof output.negotiationScript === 'string'
  );
};

const isRateValidatorMetadata = (value: unknown): value is RateValidatorDocumentMetadata => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'quoteAnalysis' in value;
};

const getDocumentRateValidation = (document: ProjectDocument): RateValidatorOutput | null => {
  if (!isRateValidatorMetadata(document.metadata)) {
    return null;
  }

  return isRateValidatorOutput(document.metadata.quoteAnalysis)
    ? document.metadata.quoteAnalysis
    : null;
};

const getDocumentRequest = (document: ProjectDocument): RateValidatorGenerationInput | null => {
  if (!isRateValidatorMetadata(document.metadata)) {
    return null;
  }

  return document.metadata.request ?? null;
};

const buildQuestionsText = (output: RateValidatorOutput) =>
  output.questionsToAskDeveloper
    .map((item, index) => `${index + 1}. ${item.question}\nWhy this matters: ${item.reason}`)
    .join('\n\n');

const buildNegotiationText = (output: RateValidatorOutput) =>
  [
    output.negotiationScript,
    '',
    'Points to clarify before signing:',
    ...output.questionsToAskDeveloper.map((item) => `- ${item.question}`),
  ].join('\n');

const CopyButton = ({
  label,
  onCopied,
  value,
  variant = 'secondary',
}: {
  label: string;
  onCopied: (label: string) => void;
  value: string;
  variant?: 'secondary' | 'ghost';
}) => (
  <Button
    onClick={async () => {
      await copyText(value);
      onCopied(label);
    }}
    size="sm"
    variant={variant}
  >
    Copy
  </Button>
);

const DetailBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-surface-raised p-4">
    <p className="text-xs uppercase tracking-normal text-muted">{label}</p>
    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text">{value}</p>
  </div>
);

export const RateValidatorPage = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { id } = useParams();
  const [activeOutput, setActiveOutput] = useState<RateValidatorOutput | null>(null);
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
        listProjectDocumentsRequest(accessToken, id, 'rate_validator'),
      ]);

      setProject(projectResponse.project);
      setDocuments(documentsResponse.documents);
      setFormState(defaultFormState(projectResponse.project));
    } catch {
      setError('Unable to load the rate validator workspace.');
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
    const output = getDocumentRateValidation(latestDocument);
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
    () => (selectedDocument ? getDocumentRateValidation(selectedDocument) : null),
    [selectedDocument],
  );

  const currentOutput = activeOutput ?? selectedDocumentOutput;
  const historyDocuments = documents.filter((document) => document.type === 'rate_validator');

  const updateFormField = useCallback(
    <Field extends keyof FormState>(field: Field, value: FormState[Field]) => {
      setFormState((current) => (current ? { ...current, [field]: value } : current));
      if (formErrors[field]) {
        setFormErrors((current) => ({ ...current, [field]: undefined }));
      }
    },
    [formErrors],
  );

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
        const response = await generateRateValidationRequest(accessToken, id, toPayload(formState));

        setActiveOutput(response.rateValidation);
        setSelectedDocumentId(response.document.id);
        setDocuments((current) => {
          const existing = current.filter((document) => document.id !== response.document.id);
          return [response.document, ...existing];
        });
      } catch {
        setError('Unable to validate this proposal right now.');
      } finally {
        setIsGenerating(false);
      }
    },
    [accessToken, formState, id],
  );

  const handleSelectDocument = useCallback((document: ProjectDocument) => {
    setSelectedDocumentId(document.id);
    setActiveOutput(getDocumentRateValidation(document));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(defaultFormState(project));
    setFormErrors({});
  }, [project]);

  if (isLoading) {
    return <LoadingState label="Loading rate validator" />;
  }

  if (error || !project || !formState) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={
            <Button onClick={() => navigate(`/projects/${id ?? ''}`)}>Back to project</Button>
          }
          description={error ?? 'The rate validator workspace could not be loaded.'}
          eyebrow="Project workspace"
          title="Rate Validator"
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
                    await copyText(buildNegotiationText(currentOutput));
                    setCopiedLabel('Negotiation script');
                  }}
                  variant="secondary"
                >
                  Copy negotiation script
                </Button>
              </>
            ) : null}
          </div>
        }
        description="Check a developer proposal for price fairness, timeline realism, missing scope, and contract risk before you sign."
        eyebrow="Project workspace"
        title="Rate Validator"
      />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proposal input</CardTitle>
              <CardDescription>
                Paste the full proposal text and add any known market or timing context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleGenerate}>
                <Textarea
                  className="min-h-[320px]"
                  error={formErrors.proposalText}
                  label="Developer proposal text"
                  onChange={(event) => updateFormField('proposalText', event.target.value)}
                  placeholder="Paste the developer's proposal, quote, milestone plan, timeline, assumptions, payment terms, and included deliverables."
                  value={formState.proposalText}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    error={formErrors.currency}
                    label="Currency"
                    maxLength={3}
                    onChange={(event) => updateFormField('currency', event.target.value)}
                    placeholder="USD"
                    value={formState.currency}
                  />
                  <Input
                    label="Country or market"
                    onChange={(event) => updateFormField('countryMarket', event.target.value)}
                    placeholder="United States"
                    value={formState.countryMarket}
                  />
                  <Input
                    label="Deadline"
                    onChange={(event) => updateFormField('deadline', event.target.value)}
                    placeholder="Launch by July 15"
                    value={formState.deadline}
                  />
                  <Select
                    label="Developer type"
                    onChange={(event) =>
                      updateFormField('developerType', event.target.value as RateValidatorDeveloperType)
                    }
                    value={formState.developerType}
                  >
                    {developerTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Select
                  label="Project urgency"
                  onChange={(event) =>
                    updateFormField('projectUrgency', event.target.value as RateValidatorUrgency)
                  }
                  value={formState.projectUrgency}
                >
                  {urgencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button onClick={resetForm} type="button" variant="ghost">
                    Reset
                  </Button>
                  <Button isLoading={isGenerating} type="submit">
                    Validate proposal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project context</CardTitle>
              <CardDescription>Saved project details used as the comparison baseline.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailBlock label="Project" value={project.name} />
              <DetailBlock
                label="Stage"
                value={getProjectOptionLabel.currentStage(project.currentStage)}
              />
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
              <CardTitle>Saved validations</CardTitle>
              <CardDescription>Previous proposal reviews for this project.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyDocuments.length > 0 ? (
                <div className="grid gap-3">
                  {historyDocuments.map((document) => {
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
                              <h3 className="text-sm font-semibold text-text">{document.title}</h3>
                              <Badge variant={isSelected ? 'accent' : 'neutral'}>
                                {isSelected ? 'Active' : 'Saved'}
                              </Badge>
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
                        {request ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {request.currency ? <Badge>{request.currency}</Badge> : null}
                            {request.countryMarket ? <Badge>{request.countryMarket}</Badge> : null}
                            <Badge>
                              {getOptionLabel(urgencyOptions, request.projectUrgency)}
                            </Badge>
                            <Badge>
                              {getOptionLabel(developerTypeOptions, request.developerType)}
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  description="Paste a proposal to create the first saved review for this project."
                  title="No validations yet"
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
                  <p className="text-sm font-medium text-text">Validating proposal</p>
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
                className={`rounded-lg border p-5 ${verdictStyles[currentOutput.priceFairnessVerdict.verdict]}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-normal opacity-75">Verdict</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                      {verdictLabels[currentOutput.priceFairnessVerdict.verdict]}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 opacity-95">
                      {currentOutput.valueJudgment}
                    </p>
                  </div>
                  <div className="grid min-w-64 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-md border border-current/20 bg-background/20 p-3">
                      <p className="text-xs uppercase tracking-normal opacity-75">Risk score</p>
                      <p className="mt-1 text-2xl font-semibold">{currentOutput.riskScore}/100</p>
                    </div>
                    <div className="rounded-md border border-current/20 bg-background/20 p-3">
                      <p className="text-xs uppercase tracking-normal opacity-75">Confidence</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatLabel(currentOutput.priceFairnessVerdict.confidenceLevel)}
                      </p>
                    </div>
                    <div className="rounded-md border border-current/20 bg-background/20 p-3">
                      <p className="text-xs uppercase tracking-normal opacity-75">Timeline</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatLabel(currentOutput.timelineRealism.verdict)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Decision summary</CardTitle>
                  <CardDescription>{currentOutput.recommendation}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <DetailBlock label="Vendor summary" value={currentOutput.vendorSummary} />
                  <DetailBlock
                    label="Quoted price"
                    value={[
                      currentOutput.quotedPrice.amount
                        ? `${currentOutput.quotedPrice.currency ?? ''} ${currentOutput.quotedPrice.amount}`.trim()
                        : 'No clear amount parsed',
                      `Basis: ${formatLabel(currentOutput.quotedPrice.basis)}`,
                      currentOutput.quotedPrice.notes,
                    ].join('\n')}
                  />
                  <DetailBlock
                    label="Estimated complexity"
                    value={`${formatLabel(currentOutput.estimatedComplexity.level)} confidence: ${formatLabel(
                      currentOutput.estimatedComplexity.confidenceLevel,
                    )}\n${currentOutput.estimatedComplexity.rationale}\n${formatBullets(
                      currentOutput.estimatedComplexity.drivers,
                    )}`}
                  />
                  <DetailBlock
                    label="Timeline realism"
                    value={`${formatLabel(currentOutput.timelineRealism.verdict)} confidence: ${formatLabel(
                      currentOutput.timelineRealism.confidenceLevel,
                    )}\n${currentOutput.timelineRealism.rationale}\n${formatBullets(
                      currentOutput.timelineRealism.concerns,
                    )}`}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Missing items</CardTitle>
                    <CardDescription>Deliverables to clarify before approval.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {currentOutput.missingDeliverables.map((item) => (
                      <DetailBlock
                        key={item.deliverable}
                        label={item.deliverable}
                        value={item.whyItMatters}
                      />
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Timeline concerns</CardTitle>
                    <CardDescription>Schedule risks that may lead to overruns.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    {currentOutput.timelineRealism.concerns.map((concern) => (
                      <div
                        className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm leading-6 text-text"
                        key={concern}
                      >
                        {concern}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>Questions to send back</CardTitle>
                      <CardDescription>
                        Exact questions for the developer before you accept the proposal.
                      </CardDescription>
                    </div>
                    <CopyButton
                      label="Questions"
                      onCopied={setCopiedLabel}
                      value={buildQuestionsText(currentOutput)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {currentOutput.questionsToAskDeveloper.map((item, index) => (
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
                      <CardTitle>Negotiation points</CardTitle>
                      <CardDescription>
                        Direct language to use when responding to the proposal.
                      </CardDescription>
                    </div>
                    <CopyButton
                      label="Negotiation script"
                      onCopied={setCopiedLabel}
                      value={buildNegotiationText(currentOutput)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border bg-surface-raised p-4 whitespace-pre-wrap text-sm leading-6 text-text">
                    {currentOutput.negotiationScript}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing risk</CardTitle>
                    <CardDescription>Overcharge and undercharge signals.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <DetailBlock
                      label={`Overcharge risk: ${formatLabel(currentOutput.overchargeRisk.riskLevel)}`}
                      value={`Confidence: ${formatLabel(
                        currentOutput.overchargeRisk.confidenceLevel,
                      )}\n${currentOutput.overchargeRisk.rationale}`}
                    />
                    <DetailBlock
                      label={`Undercharge risk: ${formatLabel(currentOutput.underchargeRisk.riskLevel)}`}
                      value={`Confidence: ${formatLabel(
                        currentOutput.underchargeRisk.confidenceLevel,
                      )}\n${currentOutput.underchargeRisk.rationale}`}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contract gaps</CardTitle>
                    <CardDescription>Terms that can create disputes or surprise cost.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {currentOutput.dangerousContractGaps.map((gap) => (
                      <DetailBlock key={gap.gap} label={gap.gap} value={gap.risk} />
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Scope review</CardTitle>
                  <CardDescription>Parsed scope items and vague wording flags.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-3">
                    {currentOutput.parsedScopeItems.map((item) => (
                      <div
                        className="rounded-md border border-border bg-surface-raised p-4"
                        key={`${item.scopeItem}-${item.description}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-text">{item.scopeItem}</h3>
                            <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge>{formatLabel(item.complexity)}</Badge>
                            <Badge variant={confidenceTone[item.confidenceLevel]}>
                              {formatLabel(item.confidenceLevel)} confidence
                            </Badge>
                            <Badge>{formatLabel(item.specificity)}</Badge>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-text">{item.pricingConcern}</p>
                      </div>
                    ))}
                  </div>
                  <DetailBlock
                    label="Vague scope flags"
                    value={formatBullets(currentOutput.vagueScopeFlags)}
                  />
                </CardContent>
              </Card>
            </div>
          ) : selectedDocument?.content ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedDocument.title}</CardTitle>
                <CardDescription>
                  {selectedDocument.summary ?? 'Saved proposal validation.'}
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
              description="Paste a developer proposal to get a verdict, risks, missing scope, questions, and negotiation language."
              title="No proposal validated yet"
            />
          )}
        </div>
      </div>
    </div>
  );
};
