import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
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
  LoadingState,
  PageHeader,
  Select,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import {
  generateDeveloperJdRequest,
  getProjectRequest,
  listProjectDocumentsRequest,
} from './project-api';
import { budgetRangeOptions, getProjectOptionLabel } from './project-options';
import type { Project, ProjectDocument } from './project-types';
import type {
  DeveloperJdDocumentMetadata,
  DeveloperJdGenerationInput,
  DeveloperJdHiringMode,
  DeveloperJdLocationPreference,
  DeveloperJdOutput,
  DeveloperJdUrgency,
} from './developer-jd-types';

type SelectOption<Value extends string> = {
  label: string;
  value: Value;
};

type CopyButtonProps = {
  label: string;
  onCopied: (label: string) => void;
  value: string;
  variant?: 'secondary' | 'ghost';
};

const hiringModeOptions: Array<SelectOption<DeveloperJdHiringMode>> = [
  { label: 'Freelancer', value: 'freelancer' },
  { label: 'Agency', value: 'agency' },
  { label: 'Technical co-founder', value: 'co_founder' },
  { label: 'Part-time hire', value: 'part_time' },
  { label: 'Full-time hire', value: 'full_time' },
];

const locationPreferenceOptions: Array<SelectOption<DeveloperJdLocationPreference>> = [
  { label: 'No preference', value: 'no_preference' },
  { label: 'Remote, anywhere', value: 'remote_anywhere' },
  { label: 'Remote, United States', value: 'remote_us' },
  { label: 'Timezone overlap required', value: 'timezone_overlap' },
  { label: 'Local preferred', value: 'local_preferred' },
];

const urgencyOptions: Array<SelectOption<DeveloperJdUrgency>> = [
  { label: 'Immediate', value: 'urgent' },
  { label: 'Within 30 days', value: 'within_30_days' },
  { label: 'Within 60 days', value: 'within_60_days' },
  { label: 'Flexible', value: 'flexible' },
];

const progressMessages = [
  'Reviewing project context and hiring preferences.',
  'Choosing the right role scope for the stage and budget.',
  'Drafting the job post and technical requirements.',
  'Preparing screening questions, task, rubric, and red flags.',
];

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

const getOptionLabel = <Value extends string>(options: Array<SelectOption<Value>>, value: Value) =>
  options.find((option) => option.value === value)?.label ?? formatLabel(value);

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

const deriveHiringMode = (project: Project | null): DeveloperJdHiringMode => {
  if (project?.budgetRange === 'over_100000' || project?.currentStage === 'scaling') {
    return 'full_time';
  }

  if (project?.budgetRange === '50000_100000' || project?.currentStage === 'launched') {
    return 'part_time';
  }

  return 'freelancer';
};

const deriveUrgency = (project: Project | null): DeveloperJdUrgency => {
  if (project?.launchTimeline === 'within_4_weeks') {
    return 'urgent';
  }

  if (project?.launchTimeline === '4_to_8_weeks') {
    return 'within_60_days';
  }

  if (project?.launchTimeline === '8_to_12_weeks') {
    return 'within_60_days';
  }

  return 'flexible';
};

const defaultFormState = (project: Project | null): DeveloperJdGenerationInput => ({
  budgetRange: project?.budgetRange ?? 'not_set',
  hiringMode: deriveHiringMode(project),
  locationPreference: 'remote_anywhere',
  urgency: deriveUrgency(project),
});

const isDeveloperJdOutput = (value: unknown): value is DeveloperJdOutput => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const output = value as Partial<DeveloperJdOutput>;

  return (
    output.moduleType === 'developer_job_description' &&
    typeof output.jobPost === 'string' &&
    typeof output.reportMarkdown === 'string' &&
    Array.isArray(output.technicalRequirements) &&
    Array.isArray(output.screeningQuestions) &&
    Boolean(output.takeHomeTask) &&
    Array.isArray(output.evaluationRubric) &&
    Array.isArray(output.redFlags)
  );
};

const isDeveloperJdMetadata = (value: unknown): value is DeveloperJdDocumentMetadata => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'developerJobDescription' in value;
};

const getDocumentOutput = (document: ProjectDocument): DeveloperJdOutput | null => {
  if (!isDeveloperJdMetadata(document.metadata)) {
    return null;
  }

  return isDeveloperJdOutput(document.metadata.developerJobDescription)
    ? document.metadata.developerJobDescription
    : null;
};

const getDocumentRequest = (document: ProjectDocument): DeveloperJdGenerationInput | null => {
  if (!isDeveloperJdMetadata(document.metadata)) {
    return null;
  }

  return document.metadata.request ?? null;
};

const buildInterviewKit = (output: DeveloperJdOutput) =>
  [
    `Interview kit for ${output.roleTitle}`,
    '',
    'Screening questions:',
    ...output.screeningQuestions.map((question, index) =>
      [
        `${index + 1}. ${question.question}`,
        'Strong answer signals:',
        formatBullets(question.goodAnswerSignals),
      ].join('\n'),
    ),
    '',
    'Practical take-home task:',
    output.takeHomeTask.title,
    `Time box: ${output.takeHomeTask.timeBox}`,
    '',
    'Instructions:',
    formatBullets(output.takeHomeTask.instructions),
    '',
    'Expected deliverables:',
    formatBullets(output.takeHomeTask.expectedDeliverables),
    '',
    'Evaluation focus:',
    formatBullets(output.takeHomeTask.evaluationFocus),
    '',
    'Scoring rubric:',
    ...output.evaluationRubric.map(
      (item) =>
        `- ${item.criterion} (${item.weight}): Strong signal: ${item.strongSignal} Concern signal: ${item.concernSignal}`,
    ),
    '',
    'Red flags:',
    ...output.redFlags.map((flag) => `- ${flag.redFlag}: ${flag.whyItMatters}`),
  ].join('\n');

const CopyButton = ({ label, onCopied, value, variant = 'secondary' }: CopyButtonProps) => (
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

const SectionHeader = ({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
    </div>
    {action}
  </div>
);

export const DeveloperJdPage = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { id } = useParams();
  const [activeOutput, setActiveOutput] = useState<DeveloperJdOutput | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<DeveloperJdGenerationInput | null>(null);
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
        listProjectDocumentsRequest(accessToken, id, 'developer_jd'),
      ]);

      setProject(projectResponse.project);
      setDocuments(documentsResponse.documents);
      setFormState(defaultFormState(projectResponse.project));
    } catch {
      setError('Unable to load the developer job description workspace.');
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
    const output = getDocumentOutput(latestDocument);
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
    () => (selectedDocument ? getDocumentOutput(selectedDocument) : null),
    [selectedDocument],
  );

  const currentOutput = activeOutput ?? selectedDocumentOutput;
  const historyDocuments = documents.filter((document) => document.type === 'developer_jd');

  const updateFormField = useCallback(
    <Field extends keyof DeveloperJdGenerationInput>(
      field: Field,
      value: DeveloperJdGenerationInput[Field],
    ) => {
      setFormState((current) => (current ? { ...current, [field]: value } : current));
    },
    [],
  );

  const handleGenerate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!accessToken || !id || !formState) {
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const response = await generateDeveloperJdRequest(accessToken, id, formState);

        setActiveOutput(response.developerJobDescription);
        setSelectedDocumentId(response.document.id);
        setDocuments((current) => {
          const existing = current.filter((document) => document.id !== response.document.id);
          return [response.document, ...existing];
        });
      } catch {
        setError('Unable to generate the developer job description right now.');
      } finally {
        setIsGenerating(false);
      }
    },
    [accessToken, formState, id],
  );

  const handleSelectDocument = useCallback((document: ProjectDocument) => {
    setSelectedDocumentId(document.id);
    setActiveOutput(getDocumentOutput(document));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(defaultFormState(project));
  }, [project]);

  if (isLoading) {
    return <LoadingState label="Loading developer job description workspace" />;
  }

  if (error || !project || !formState) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={
            <Button onClick={() => navigate(`/projects/${id ?? ''}`)}>Back to project</Button>
          }
          description={error ?? 'The workspace could not be loaded.'}
          eyebrow="Project workspace"
          title="Developer Job Description"
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
                    await copyText(currentOutput.jobPost);
                    setCopiedLabel('Job post');
                  }}
                  variant="secondary"
                >
                  Copy job post
                </Button>
                <Button
                  onClick={async () => {
                    await copyText(buildInterviewKit(currentOutput));
                    setCopiedLabel('Interview kit');
                  }}
                  variant="secondary"
                >
                  Copy interview kit
                </Button>
              </>
            ) : null}
          </div>
        }
        description="Create a hiring brief with a ready-to-post role description, screening flow, take-home task, rubric, and red flags."
        eyebrow="Project workspace"
        title="Developer Job Description"
      />

      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hiring preferences</CardTitle>
              <CardDescription>
                Choose the role shape and constraints before generating the hiring brief.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleGenerate}>
                <Select
                  label="Hiring mode"
                  onChange={(event) =>
                    updateFormField('hiringMode', event.target.value as DeveloperJdHiringMode)
                  }
                  value={formState.hiringMode}
                >
                  {hiringModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Budget"
                  onChange={(event) => updateFormField('budgetRange', event.target.value)}
                  value={formState.budgetRange}
                >
                  {budgetRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Location preference"
                  onChange={(event) =>
                    updateFormField(
                      'locationPreference',
                      event.target.value as DeveloperJdLocationPreference,
                    )
                  }
                  value={formState.locationPreference}
                >
                  {locationPreferenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Urgency"
                  onChange={(event) =>
                    updateFormField('urgency', event.target.value as DeveloperJdUrgency)
                  }
                  value={formState.urgency}
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
                    Generate brief
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project context</CardTitle>
              <CardDescription>Current project details used to shape the brief.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailBlock label="Project" value={project.name} />
              <DetailBlock
                label="Stage"
                value={getProjectOptionLabel.currentStage(project.currentStage)}
              />
              <DetailBlock
                label="Launch timeline"
                value={getProjectOptionLabel.launchTimeline(project.launchTimeline)}
              />
              <DetailBlock
                label="Founder technical level"
                value={getProjectOptionLabel.founderTechnicalLevel(project.founderTechnicalLevel)}
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
              <CardTitle>Saved document history</CardTitle>
              <CardDescription>Developer hiring briefs generated for this project.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyDocuments.length > 0 ? (
                <div className="grid gap-3">
                  {historyDocuments.map((document) => {
                    const isSelected = document.id === selectedDocumentId;
                    const request = getDocumentRequest(document);

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
                            <Badge>{getOptionLabel(hiringModeOptions, request.hiringMode)}</Badge>
                            <Badge>{getProjectOptionLabel.budgetRange(request.budgetRange)}</Badge>
                            <Badge>
                              {getOptionLabel(
                                locationPreferenceOptions,
                                request.locationPreference,
                              )}
                            </Badge>
                            <Badge>{getOptionLabel(urgencyOptions, request.urgency)}</Badge>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  description="Generate the first brief, then return here to compare versions as hiring constraints change."
                  title="No developer job descriptions yet"
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
                  <p className="text-sm font-medium text-text">
                    Generating developer job description
                  </p>
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
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-normal text-muted">
                        Generated hiring brief
                      </p>
                      <CardTitle className="mt-1">{currentOutput.roleTitle}</CardTitle>
                      <CardDescription>{currentOutput.roleSummary}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <CopyButton
                        label="Job post"
                        onCopied={setCopiedLabel}
                        value={currentOutput.jobPost}
                      />
                      <CopyButton
                        label="Interview kit"
                        onCopied={setCopiedLabel}
                        value={buildInterviewKit(currentOutput)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <DetailBlock label="Seniority" value={currentOutput.seniorityRecommendation} />
                  <DetailBlock label="Employment type" value={formatLabel(currentOutput.employmentType)} />
                  <DetailBlock label="Price guidance" value={currentOutput.priceTimelineGuidance.priceGuidance} />
                  <DetailBlock
                    label="Timeline guidance"
                    value={currentOutput.priceTimelineGuidance.timelineGuidance}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <SectionHeader
                    action={
                      <CopyButton
                        label="Job post"
                        onCopied={setCopiedLabel}
                        value={currentOutput.jobPost}
                      />
                    }
                    description="Ready to paste into LinkedIn or Upwork."
                    title="Job post"
                  />
                </CardHeader>
                <CardContent>
                  <div className="max-h-[560px] overflow-auto rounded-md border border-border bg-surface-raised p-4 whitespace-pre-wrap text-sm leading-6 text-text">
                    {currentOutput.jobPost}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <SectionHeader
                    description="Requirements tied to the actual product scope and launch constraints."
                    title="Technical requirements"
                  />
                </CardHeader>
                <CardContent className="grid gap-4">
                  {currentOutput.technicalRequirements.map((requirement) => (
                    <div
                      className="rounded-md border border-border bg-surface-raised p-4"
                      key={requirement.category}
                    >
                      <h3 className="text-sm font-semibold text-text">{requirement.category}</h3>
                      <div className="mt-3 grid gap-2">
                        {requirement.requirements.map((item) => (
                          <p
                            className="rounded-md border border-border bg-surface px-3 py-2 text-sm leading-6 text-text"
                            key={item}
                          >
                            {item}
                          </p>
                        ))}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted">
                        {requirement.whyItMatters}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <SectionHeader
                    action={
                      <CopyButton
                        label="Interview kit"
                        onCopied={setCopiedLabel}
                        value={buildInterviewKit(currentOutput)}
                      />
                    }
                    description="Project-specific questions, work sample, scoring rubric, and risk signals."
                    title="Interview questions"
                  />
                </CardHeader>
                <CardContent className="grid gap-4">
                  {currentOutput.screeningQuestions.map((question, index) => (
                    <div
                      className="rounded-md border border-border bg-surface-raised p-4"
                      key={question.question}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <Badge variant="accent">{index + 1}</Badge>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold leading-6 text-text">
                            {question.question}
                          </h3>
                          <div className="mt-3 grid gap-2">
                            {question.goodAnswerSignals.map((signal) => (
                              <p
                                className="rounded-md border border-border bg-surface px-3 py-2 text-sm leading-6 text-muted"
                                key={signal}
                              >
                                {signal}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <SectionHeader
                    description="A scoped work sample designed to reveal delivery judgment without asking for unpaid product work."
                    title="Take-home task"
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailBlock label={currentOutput.takeHomeTask.title} value={currentOutput.takeHomeTask.timeBox} />
                  <div className="grid gap-4 lg:grid-cols-3">
                    <DetailBlock
                      label="Instructions"
                      value={formatBullets(currentOutput.takeHomeTask.instructions)}
                    />
                    <DetailBlock
                      label="Expected deliverables"
                      value={formatBullets(currentOutput.takeHomeTask.expectedDeliverables)}
                    />
                    <DetailBlock
                      label="Evaluation focus"
                      value={formatBullets(currentOutput.takeHomeTask.evaluationFocus)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <SectionHeader
                    description="A consistent scoring guide for comparing candidates or vendors."
                    title="Scoring rubric"
                  />
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-normal text-muted">
                        <th className="border-b border-border px-3 py-3 font-medium">Criterion</th>
                        <th className="border-b border-border px-3 py-3 font-medium">Weight</th>
                        <th className="border-b border-border px-3 py-3 font-medium">Strong signal</th>
                        <th className="border-b border-border px-3 py-3 font-medium">Concern signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentOutput.evaluationRubric.map((item) => (
                        <tr key={item.criterion}>
                          <td className="border-b border-border px-3 py-4 align-top text-sm font-medium text-text">
                            {item.criterion}
                          </td>
                          <td className="border-b border-border px-3 py-4 align-top text-sm text-muted">
                            {item.weight}
                          </td>
                          <td className="border-b border-border px-3 py-4 align-top text-sm leading-6 text-text">
                            {item.strongSignal}
                          </td>
                          <td className="border-b border-border px-3 py-4 align-top text-sm leading-6 text-muted">
                            {item.concernSignal}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <SectionHeader
                    description="Signals that should slow down or stop the hiring process."
                    title="Red flags"
                  />
                </CardHeader>
                <CardContent className="grid gap-3">
                  {currentOutput.redFlags.map((flag) => (
                    <DetailBlock key={flag.redFlag} label={flag.redFlag} value={flag.whyItMatters} />
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : selectedDocument?.content ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedDocument.title}</CardTitle>
                <CardDescription>
                  {selectedDocument.summary ?? 'Saved developer job description.'}
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
              description="Choose the hiring preferences, then generate a brief with a job post, interview questions, task, scoring rubric, and red flags."
              title="No hiring brief generated yet"
            />
          )}
        </div>
      </div>
    </div>
  );
};
