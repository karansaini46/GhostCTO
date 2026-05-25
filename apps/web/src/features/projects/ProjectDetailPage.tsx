import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Badge,
  type BadgeProps,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  LoadingState,
  PageHeader,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { getBillingStatusRequest } from '../billing/billing-api';
import type { BillingStatus } from '../billing/billing-types';
import { GenerationLimitCallout } from './generation-errors';
import { getGenerationErrorMessage, isGenerationLimitError } from './generation-error-utils';
import {
  createDeveloperJdRequest,
  exportProjectDocumentPdfRequest,
  generateRoadmapRequest,
  getProjectRequest,
} from './project-api';
import { getProjectOptionLabel } from './project-options';
import type { Project, ProjectAnswer, ProjectDocument } from './project-types';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const formatStatus = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getStatusVariant = (status: string): BadgeProps['variant'] => {
  if (status === 'COMPLETED' || status === 'ACTIVE') {
    return 'success';
  }

  if (status === 'FAILED') {
    return 'danger';
  }

  if (status === 'PENDING' || status === 'PROCESSING' || status === 'DRAFT') {
    return 'warning';
  }

  return 'neutral';
};

const documentTypeLabels: Record<string, string> = {
  code_audit: 'Code Audit',
  developer_jd: 'Developer JD',
  rate_validator: 'Rate Validator',
  roadmap: 'Roadmap',
  stack_advisor: 'Stack Advisor',
  technical_spec: 'Technical Spec',
  vetting_scorecard: 'Vetting Scorecard',
};

const getDocumentTypeLabel = (type: string) => documentTypeLabels[type] ?? formatStatus(type);

const exportableDocumentTypes = new Set([
  'developer_jd',
  'roadmap',
  'stack_advisor',
  'technical_spec',
]);

const sanitizeFilename = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'document';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

type WorkspaceModule = {
  description: string;
  documentTypes: string[];
  title: string;
  whenReady: string;
};

type BodylessGenerationType = 'developer_jd' | 'roadmap';

const workspaceModules: WorkspaceModule[] = [
  {
    description: 'Milestones, release order, and founder decisions needed before execution.',
    documentTypes: ['roadmap'],
    title: 'Roadmap',
    whenReady: 'Prepare the first execution plan',
  },
  {
    description: 'Recommended stack choices tied to budget, timeline, and product complexity.',
    documentTypes: ['stack_advisor'],
    title: 'Stack Advisor',
    whenReady: 'Review stack options for the build',
  },
  {
    description: 'Implementation-ready scope for vendors, contractors, and internal review.',
    documentTypes: ['technical_spec'],
    title: 'Technical Spec',
    whenReady: 'Turn scope into implementation detail',
  },
  {
    description: 'Role scope, required skills, interview focus, and delivery expectations.',
    documentTypes: ['developer_jd'],
    title: 'Developer JD',
    whenReady: 'Define the first technical hire or contractor role',
  },
  {
    description: 'Budget and quote review against expected delivery effort and complexity.',
    documentTypes: ['rate_validator'],
    title: 'Rate Validator',
    whenReady: 'Validate the next vendor quote',
  },
  {
    description: 'Repository, architecture, security, and maintainability review for shipped work.',
    documentTypes: ['code_audit'],
    title: 'Code Audit',
    whenReady: 'Review a codebase when one is available',
  },
  {
    description: 'Structured review criteria for evaluating technical candidates and vendors.',
    documentTypes: ['vetting_scorecard'],
    title: 'Vetting Scorecard',
    whenReady: 'Prepare evaluation criteria',
  },
  {
    description: 'Project-specific technical guidance using the saved workspace context.',
    documentTypes: [],
    title: 'CTO Chat',
    whenReady: 'Ask project-specific follow-up questions',
  },
];

const formatAnswer = (answer: ProjectAnswer) => {
  if (answer.key === 'existingAssets' && Array.isArray(answer.answer)) {
    return answer.answer
      .filter((item): item is string => typeof item === 'string')
      .map((item) => getProjectOptionLabel.existingAsset(item))
      .join(', ');
  }

  if (Array.isArray(answer.answer)) {
    return answer.answer
      .filter((item): item is string => typeof item === 'string')
      .map((item) => `- ${item}`)
      .join('\n');
  }

  return typeof answer.answer === 'string' ? answer.answer : 'Not set';
};

type DetailBlockProps = {
  label: string;
  value: string | null;
};

const DetailBlock = ({ label, value }: DetailBlockProps) => (
  <div className="rounded-md border border-border bg-surface-raised p-4">
    <p className="text-xs uppercase tracking-normal text-muted">{label}</p>
    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text">{value || 'Not set'}</p>
  </div>
);

type ModuleCardProps = {
  contextReady: boolean;
  document: ProjectDocument | null;
  generationType: BodylessGenerationType | null;
  isGenerating: boolean;
  isLocked: boolean;
  module: WorkspaceModule;
  onGenerate: (generationType: BodylessGenerationType) => void;
  projectId: string;
};

const ModuleCard = ({
  contextReady,
  document,
  generationType,
  isGenerating,
  isLocked,
  module,
  onGenerate,
  projectId,
}: ModuleCardProps) => {
  const moduleLink =
    module.title === 'CTO Chat'
      ? {
          label: 'Open chat',
          path: `/projects/${projectId}/chat`,
        }
      : module.documentTypes.includes('stack_advisor')
        ? {
            label: 'Open advisor',
            path: `/projects/${projectId}/stack-advice`,
          }
        : module.documentTypes.includes('technical_spec')
          ? {
              label: 'Open writer',
              path: `/projects/${projectId}/specs`,
            }
          : module.documentTypes.includes('rate_validator')
            ? {
                label: 'Open validator',
                path: `/projects/${projectId}/rate-validator`,
              }
            : module.documentTypes.includes('code_audit')
              ? {
                  label: 'Open auditor',
                  path: `/projects/${projectId}/code-audit`,
                }
              : module.documentTypes.includes('vetting_scorecard')
                ? {
                    label: 'Open vetting',
                    path: `/projects/${projectId}/vetting`,
                  }
                : document
                  ? {
                      label: 'Open document',
                      path: `/projects/${projectId}/documents/${document.id}`,
                    }
                  : null;
  const status = document
    ? formatStatus(document.status)
    : isLocked
      ? 'Locked'
      : contextReady
        ? 'Ready'
        : 'Needs context';
  const variant = document
    ? getStatusVariant(document.status)
    : isLocked
      ? 'warning'
      : contextReady
        ? 'accent'
        : 'warning';
  const nextAction = !contextReady
    ? 'Complete summary, customer, stage, and launch scope first'
    : isLocked
      ? 'Activate lifetime access to unlock this module'
      : document
        ? document.status === 'COMPLETED'
          ? 'Review the saved document'
          : 'Check the current document status'
        : module.whenReady;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-normal text-text">{module.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{module.description}</p>
        </div>
        <Badge variant={variant}>{status}</Badge>
      </div>
      <div className="mt-4 rounded-md border border-border bg-surface-raised p-3">
        <p className="text-xs uppercase tracking-normal text-muted">Next action</p>
        <p className="mt-1 text-sm font-medium leading-5 text-text">{nextAction}</p>
      </div>
      {moduleLink ? (
        <div className="mt-4">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface-raised px-4 text-sm font-medium tracking-normal text-text transition-colors hover:border-accent/35 hover:bg-surface-raised/80"
            to={isLocked && !document ? '/billing' : moduleLink.path}
          >
            {isLocked && !document ? 'Unlock access' : moduleLink.label}
          </Link>
        </div>
      ) : null}
      {!moduleLink && generationType ? (
        <div className="mt-4">
          {isLocked ? (
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface-raised px-4 text-sm font-medium tracking-normal text-text transition-colors hover:border-accent/35 hover:bg-surface-raised/80"
              to="/billing"
            >
              Unlock access
            </Link>
          ) : (
            <Button
              disabled={!contextReady}
              isLoading={isGenerating}
              onClick={() => onGenerate(generationType)}
              variant="secondary"
            >
              {generationType === 'roadmap' ? 'Generate roadmap' : 'Create JD'}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const ProjectDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { accessToken, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportingDocumentId, setExportingDocumentId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationLimitMessage, setGenerationLimitMessage] = useState<string | null>(null);
  const [generatingModule, setGeneratingModule] = useState<BodylessGenerationType | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);

  const loadProject = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getProjectRequest(accessToken, id);
      setProject(response.project);
      setGenerationError(null);
      setGenerationLimitMessage(null);
    } catch {
      setError('Unable to load this project.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    if (!accessToken || !id) {
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getProjectRequest(accessToken, id);

        if (!active) {
          return;
        }

        setProject(response.project);
        setError(null);
      } catch {
        if (!active) {
          return;
        }

        setError('Unable to load this project.');
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
    if (!accessToken) {
      return;
    }

    let active = true;

    const loadBillingStatus = async () => {
      try {
        const response = await getBillingStatusRequest(accessToken);

        if (active) {
          setBillingStatus(response.billingStatus);
        }
      } catch {
        if (active) {
          setBillingStatus(null);
        }
      }
    };

    void loadBillingStatus();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const moduleDocuments = useMemo(() => {
    const documentsByType = new Map<string, ProjectDocument>();

    project?.documents.forEach((document) => {
      if (!documentsByType.has(document.type)) {
        documentsByType.set(document.type, document);
      }
    });

    return documentsByType;
  }, [project]);

  const handleExportPdf = async (document: ProjectDocument) => {
    if (!accessToken || !project) {
      return;
    }

    setExportError(null);
    setExportingDocumentId(document.id);

    try {
      const response = await exportProjectDocumentPdfRequest(accessToken, project.id, document.id);
      const fallbackFilename = `${sanitizeFilename(project.name)}-${sanitizeFilename(document.title)}.pdf`;

      downloadBlob(response.blob, response.filename ?? fallbackFilename);
    } catch {
      setExportError('Unable to export this document as a PDF.');
    } finally {
      setExportingDocumentId(null);
    }
  };

  const handleGenerateBodylessDocument = async (generationType: BodylessGenerationType) => {
    if (!accessToken || !project) {
      return;
    }

    setGenerationError(null);
    setGenerationLimitMessage(null);
    setGeneratingModule(generationType);

    try {
      const response =
        generationType === 'roadmap'
          ? await generateRoadmapRequest(accessToken, project.id)
          : await createDeveloperJdRequest(accessToken, project.id);

      setProject((current) =>
        current
          ? {
              ...current,
              documents: [
                response.document,
                ...current.documents.filter((document) => document.id !== response.document.id),
              ],
            }
          : current,
      );
    } catch (requestError) {
      const message = getGenerationErrorMessage(
        requestError,
        generationType === 'roadmap'
          ? 'Unable to generate the roadmap right now.'
          : 'Unable to create the developer JD right now.',
      );

      setGenerationError(message);
      setGenerationLimitMessage(isGenerationLimitError(requestError) ? message : null);
    } finally {
      setGeneratingModule(null);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading project workspace" />;
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={<Button onClick={() => navigate('/workspace')}>Back to workspace</Button>}
          description={error ?? 'Project not found.'}
          eyebrow="Project context"
          title="Unable to load project"
        />
        <Card className="border-danger/35 bg-danger/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted">
              The project may not exist, or your account may not have access to it.
            </p>
            <Button onClick={loadProject} variant="secondary">
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contextReady = Boolean(
    project.ideaSummary &&
    project.targetCustomer &&
    project.currentStage &&
    project.mustHaveFeatures.length > 0,
  );
  const isLifetimePlan = user?.plan === 'LIFETIME';
  const generationLimitReached = !isLifetimePlan && billingStatus?.access.canGenerate === false;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button
              onClick={() => navigate(`/projects/${project.id}/settings`)}
              variant="secondary"
            >
              Project settings
            </Button>
            <Button onClick={() => navigate('/projects/new')} variant="secondary">
              New project
            </Button>
          </>
        }
        description={`Created ${formatDate(project.createdAt)}. Last updated ${formatDate(project.updatedAt)}.`}
        eyebrow="Project workspace"
        title={project.name}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={getStatusVariant(project.status)}>{formatStatus(project.status)}</Badge>
        <Badge>{project.industry ?? 'Industry not set'}</Badge>
        <Badge>{getProjectOptionLabel.currentStage(project.currentStage)}</Badge>
        <Badge>{contextReady ? 'Context ready' : 'Context needs review'}</Badge>
        <Badge variant={isLifetimePlan ? 'success' : 'warning'}>
          {isLifetimePlan ? 'Lifetime access' : 'Free plan'}
        </Badge>
      </div>

      {generationLimitReached ? (
        <Card className="border-warning/35 bg-warning/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-warning">Free document limit reached</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Activate lifetime access to generate more project documents.
              </p>
            </div>
            <Button onClick={() => navigate('/billing')} variant="secondary">
              Open billing
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {generationLimitMessage ? (
        <GenerationLimitCallout message={generationLimitMessage} />
      ) : generationError ? (
        <Card className="border-danger/35 bg-danger/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-danger">{generationError}</p>
            <Button onClick={() => setGenerationError(null)} variant="secondary">
              Dismiss
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Project summary</CardTitle>
          <CardDescription>The saved context used across the workspace.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <DetailBlock label="Idea summary" value={project.ideaSummary} />
            <DetailBlock label="Target customer" value={project.targetCustomer} />
            <DetailBlock label="Biggest concern" value={project.biggestConcern} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <DetailBlock
              label="Stage"
              value={getProjectOptionLabel.currentStage(project.currentStage)}
            />
            <DetailBlock
              label="Budget"
              value={getProjectOptionLabel.budgetRange(project.budgetRange)}
            />
            <DetailBlock
              label="Timeline"
              value={getProjectOptionLabel.launchTimeline(project.launchTimeline)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>Focused work areas connected to this project context.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workspaceModules.map((module) => {
            const document =
              module.documentTypes
                .map((type) => moduleDocuments.get(type) ?? null)
                .find((item): item is ProjectDocument => item !== null) ?? null;

            return (
              <ModuleCard
                contextReady={contextReady}
                document={document}
                generationType={
                  module.documentTypes.includes('roadmap')
                    ? 'roadmap'
                    : module.documentTypes.includes('developer_jd')
                      ? 'developer_jd'
                      : null
                }
                isGenerating={
                  generatingModule !== null &&
                  (module.documentTypes.includes(generatingModule) ||
                    (generatingModule === 'developer_jd' &&
                      module.documentTypes.includes('developer_jd')))
                }
                isLocked={generationLimitReached && module.documentTypes.length > 0 && !document}
                key={module.title}
                module={module}
                onGenerate={handleGenerateBodylessDocument}
                projectId={project.id}
              />
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Launch scope</CardTitle>
            <CardDescription>The must-have feature set saved from onboarding.</CardDescription>
          </CardHeader>
          <CardContent>
            {project.mustHaveFeatures.length > 0 ? (
              <div className="grid gap-3">
                {project.mustHaveFeatures.map((feature) => (
                  <div
                    className="rounded-md border border-border bg-surface-raised p-4 text-sm leading-6 text-text"
                    key={feature}
                  >
                    {feature}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted">
                No launch features have been saved yet. Add the smallest feature set needed to
                validate the product with real customers.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution constraints</CardTitle>
            <CardDescription>Budget, scope, timeline, and readiness details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailBlock
              label="Product type"
              value={getProjectOptionLabel.productType(project.productType)}
            />
            <DetailBlock
              label="Monetization"
              value={getProjectOptionLabel.monetization(project.monetization)}
            />
            <DetailBlock
              label="Budget range"
              value={getProjectOptionLabel.budgetRange(project.budgetRange)}
            />
            <DetailBlock
              label="Launch timeline"
              value={getProjectOptionLabel.launchTimeline(project.launchTimeline)}
            />
            <DetailBlock
              label="Technical level"
              value={getProjectOptionLabel.founderTechnicalLevel(project.founderTechnicalLevel)}
            />
            <DetailBlock
              label="Existing assets"
              value={
                project.existingAssets
                  .map((asset) => getProjectOptionLabel.existingAsset(asset))
                  .join(', ') || null
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Recent documents</CardTitle>
              <CardDescription>Latest completed and in-progress project documents.</CardDescription>
            </div>
            <Button
              onClick={() => navigate(`/projects/${project.id}/documents`)}
              variant="secondary"
            >
              View all documents
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {exportError ? (
            <div className="mb-4 rounded-md border border-danger/35 bg-danger/5 p-4 text-sm leading-6 text-danger">
              {exportError}
            </div>
          ) : null}
          {project.documents.length > 0 ? (
            <div className="grid gap-3">
              {project.documents.map((document) => (
                <div
                  className="rounded-md border border-border bg-surface-raised p-4"
                  key={document.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold tracking-normal text-text">
                          {document.title}
                        </h3>
                        <Badge>{getDocumentTypeLabel(document.type)}</Badge>
                        <Badge variant="accent">v{document.version}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {document.summary ?? 'No summary saved for this document.'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant={getStatusVariant(document.status)}>
                        {formatStatus(document.status)}
                      </Badge>
                      <Badge>{formatDate(document.completedAt ?? document.updatedAt)}</Badge>
                      {exportableDocumentTypes.has(document.type) ? (
                        <Button
                          isLoading={exportingDocumentId === document.id}
                          onClick={() => handleExportPdf(document)}
                          size="sm"
                          variant="secondary"
                        >
                          Export PDF
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Complete the project context, then start with a roadmap or technical spec so future vendor and hiring decisions have a clear source of truth."
              title="No documents yet"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved answers</CardTitle>
          <CardDescription>
            Every onboarding answer is stored with the project record.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {project.answers.map((answer) => (
            <DetailBlock
              key={answer.id}
              label={answer.label ?? answer.key}
              value={formatAnswer(answer)}
            />
          ))}
        </CardContent>
      </Card>

      <Link className="text-sm font-medium text-accent hover:text-accent/80" to="/workspace">
        Back to workspace
      </Link>
    </div>
  );
};
