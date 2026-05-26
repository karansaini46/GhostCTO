import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, FolderKanban, PlusCircle, Sparkles } from 'lucide-react';

import {
  Badge,
  type BadgeProps,
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { freePlanLimits, getPlanLabel } from '../billing/billing-plan';
import { listProjectsRequest } from '../projects/project-api';
import { getProjectOptionLabel } from '../projects/project-options';
import type { Project, ProjectDocument } from '../projects/project-types';

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

const getProjectStatusVariant = (status: string): BadgeProps['variant'] => {
  if (status === 'ACTIVE') {
    return 'success';
  }

  if (status === 'DRAFT') {
    return 'warning';
  }

  return 'neutral';
};

const documentTypeLabels: Record<string, string> = {
  code_audit: 'Code Audit',
  developer_jd: 'Developer Brief',
  rate_validator: 'Quote Validator',
  roadmap: 'Roadmap',
  stack_advisor: 'Stack Advisor',
  technical_spec: 'Technical Spec',
  vetting_scorecard: 'Vetting Scorecard',
};

const getDocumentTypeLabel = (type: string) => documentTypeLabels[type] ?? formatStatus(type);

const hasDocumentType = (project: Project, type: string) =>
  project.documents.some((document) => document.type === type && document.status === 'COMPLETED');

const getNextAction = (project: Project) => {
  if (!project.ideaSummary || !project.targetCustomer || !project.currentStage) {
    return {
      label: 'Complete the project context',
      path: `/projects/${project.id}/settings`,
    };
  }

  if (project.mustHaveFeatures.length === 0) {
    return {
      label: 'Define the first launch scope',
      path: `/projects/${project.id}/settings`,
    };
  }

  if (!hasDocumentType(project, 'roadmap')) {
    return {
      label: 'Generate the technical roadmap',
      path: `/projects/${project.id}/roadmap`,
    };
  }

  if (!hasDocumentType(project, 'technical_spec')) {
    return {
      label: 'Turn scope into a technical spec',
      path: `/projects/${project.id}/technical-spec`,
    };
  }

  return {
    label: 'Review the latest documents',
    path: `/projects/${project.id}/documents`,
  };
};

type RecentDocument = ProjectDocument & {
  projectName: string;
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  const loadProjects = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await listProjectsRequest(accessToken);
      setProjects(response.projects);
    } catch {
      setError('We could not load your workspace. Your account is safe, but this page needs a refresh.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const isLifetimePlan = user?.plan === 'LIFETIME';
  const projectLimitReached = !isLifetimePlan && projects.length >= freePlanLimits.projects;
  const primaryProject = projects[0] ?? null;
  const recommendedAction = primaryProject ? getNextAction(primaryProject) : null;
  const recentDocuments = useMemo(
    () =>
      projects
        .flatMap((project): RecentDocument[] =>
          project.documents.map((document) => ({
            ...document,
            projectName: project.name,
          })),
        )
        .sort(
          (left, right) =>
            new Date(right.completedAt ?? right.updatedAt).getTime() -
            new Date(left.completedAt ?? left.updatedAt).getTime(),
        )
        .slice(0, 4),
    [projects],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button
            leftIcon={<PlusCircle />}
            onClick={() => navigate(projectLimitReached ? '/billing' : '/projects/new')}
          >
            {projectLimitReached ? 'Unlock more projects' : 'Create project'}
          </Button>
        }
        description="A calm overview of what you are preparing, what is ready, and what needs your attention next."
        eyebrow="Founder workspace"
        title="Dashboard"
      />

      {projectLimitReached ? (
        <Surface className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" tone="warning">
          <div>
            <p className="text-sm font-semibold text-text">Free project limit reached</p>
            <p className="mt-1 text-sm leading-6 text-secondary">
              Activate lifetime access when you are ready to plan more than one project.
            </p>
          </div>
          <Button onClick={() => navigate('/billing')} variant="secondary">
            Open billing
          </Button>
        </Surface>
      ) : null}

      {isLoading ? <LoadingState label="Loading your workspace" /> : null}

      {error ? (
        <ErrorState
          action={<Button onClick={loadProjects} variant="secondary">Try again</Button>}
          description="Refresh the workspace or try again after checking your connection."
          title={error}
        />
      ) : null}

      {!isLoading && !error && projects.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <EmptyState
            action={<Button leftIcon={<PlusCircle />} onClick={() => navigate('/projects/new')}>Start guided intake</Button>}
            className="min-h-[22rem]"
            description="Create your first project so GhostCTO can understand the customer, launch scope, budget, and risks before recommending the next technical step."
            title="No project room yet"
          />
          <Card>
            <CardContent className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                First session
              </p>
              <h2 className="font-editorial text-3xl font-semibold text-text">
                Start with context, not tools.
              </h2>
              <p className="text-sm leading-7 text-secondary">
                The intake asks one group of questions at a time, then creates a project room where
                roadmap, stack, spec, quote, hiring, and review tools use the same saved context.
              </p>
              <div className="grid gap-3">
                {['Customer and problem', 'Budget and timeline', 'Must-have launch scope'].map((item) => (
                  <div className="flex items-center gap-3 rounded-md border border-subtle bg-surface-raised p-3" key={item}>
                    <Sparkles className="h-4 w-4 text-accent" />
                    <p className="text-sm font-semibold text-text">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!isLoading && !error && projects.length > 0 ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <Surface className="p-6 sm:p-7" tone="elevated">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Recommended next step
              </p>
              <h2 className="mt-3 font-editorial text-4xl font-semibold text-text">
                {recommendedAction?.label}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
                {primaryProject?.name} is the most recent project in your workspace. Continue from
                the next useful action instead of choosing from every tool at once.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  rightIcon={<ArrowRight />}
                  onClick={() => recommendedAction && navigate(recommendedAction.path)}
                >
                  Continue
                </Button>
                <Button onClick={() => navigate(`/projects/${primaryProject?.id}`)} variant="secondary">
                  Open project room
                </Button>
              </div>
            </Surface>

            <Surface tone="soft">
              <p className="text-sm font-semibold text-text">Account</p>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Founder</p>
                  <p className="mt-1 break-all text-sm font-semibold text-text">
                    {user?.name ?? user?.email ?? 'Not set'}
                  </p>
                  {user?.email ? (
                    <p className="mt-1 break-all text-sm leading-5 text-secondary">{user.email}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Plan</p>
                  <div className="mt-1">
                    <Badge variant={isLifetimePlan ? 'success' : 'warning'}>
                      {getPlanLabel(user?.plan)}
                    </Badge>
                  </div>
                </div>
                <Button onClick={() => navigate('/settings')} size="sm" variant="secondary">
                  Account settings
                </Button>
              </div>
            </Surface>
          </div>

          <Card>
            <CardContent className="space-y-5">
              <SectionHeader
                action={<Button onClick={() => navigate('/projects/new')} size="sm" variant="secondary">New project</Button>}
                description="Each project room keeps the context and documents for one business idea."
                title="Active projects"
              />
              <div className="grid gap-3">
                {projects.map((project) => {
                  const nextAction = getNextAction(project);

                  return (
                    <Link
                      className="group block rounded-panel border border-subtle bg-surface-card p-4 shadow-sm transition-all duration-200 ease-soft hover:border-accent/35 hover:shadow-soft"
                      key={project.id}
                      to={`/projects/${project.id}`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-accent" />
                            <h2 className="text-lg font-semibold tracking-normal text-text">
                              {project.name}
                            </h2>
                            <Badge variant={getProjectStatusVariant(project.status)}>
                              {formatStatus(project.status)}
                            </Badge>
                          </div>
                          <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-secondary">
                            {project.ideaSummary ??
                              'Project context is ready to be completed before planning begins.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge>{project.industry ?? 'Industry not set'}</Badge>
                            <Badge>{getProjectOptionLabel.currentStage(project.currentStage)}</Badge>
                            <Badge>{getProjectOptionLabel.launchTimeline(project.launchTimeline)}</Badge>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:w-[24rem]">
                          <div className="rounded-md border border-subtle bg-surface-raised p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Created</p>
                            <p className="mt-1 text-sm font-semibold text-text">
                              {formatDate(project.createdAt)}
                            </p>
                          </div>
                          <div className="rounded-md border border-accent/20 bg-accent-soft p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Next</p>
                            <p className="mt-1 text-sm font-semibold leading-5 text-text">
                              {nextAction.label}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5">
              <SectionHeader
                description="Recent reports and reviews across your projects."
                title="Recent outputs"
              />
              {recentDocuments.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {recentDocuments.map((document) => (
                    <Link
                      className="rounded-panel border border-subtle bg-surface-card p-4 shadow-sm transition-all duration-200 ease-soft hover:border-accent/35"
                      key={document.id}
                      to={`/projects/${document.projectId ?? primaryProject?.id}/documents/${document.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-text">{document.title}</p>
                            <Badge>{getDocumentTypeLabel(document.type)}</Badge>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-secondary">
                            {document.summary ?? 'Saved without a summary.'}
                          </p>
                          <p
                            aria-hidden="true"
                            className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted"
                          >
                            {document.projectName} · {formatDate(document.completedAt ?? document.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="Generate your first roadmap or technical spec to create a document you can send to a developer."
                  title="No outputs yet"
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};
