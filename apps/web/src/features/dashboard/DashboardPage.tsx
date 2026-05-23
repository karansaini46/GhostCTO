import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
import { freePlanLimits, getPlanLabel } from '../billing/billing-plan';
import { listProjectsRequest } from '../projects/project-api';
import { getProjectOptionLabel } from '../projects/project-options';
import type { Project } from '../projects/project-types';

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

const hasDocumentType = (project: Project, type: string) =>
  project.documents.some((document) => document.type === type && document.status === 'COMPLETED');

const getNextAction = (project: Project) => {
  if (!project.ideaSummary || !project.targetCustomer || !project.currentStage) {
    return 'Complete the project context';
  }

  if (project.mustHaveFeatures.length === 0) {
    return 'Define the first launch scope';
  }

  if (!hasDocumentType(project, 'roadmap')) {
    return 'Prepare the execution roadmap';
  }

  if (!hasDocumentType(project, 'technical_spec')) {
    return 'Turn scope into a technical spec';
  }

  return 'Review the latest project documents';
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
      setError('Unable to load projects right now.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await listProjectsRequest(accessToken);

        if (!active) {
          return;
        }

        setProjects(response.projects);
        setError(null);
      } catch {
        if (!active) {
          return;
        }

        setError('Unable to load projects right now.');
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
  }, [accessToken]);

  const isLifetimePlan = user?.plan === 'LIFETIME';
  const projectLimitReached = !isLifetimePlan && projects.length >= freePlanLimits.projects;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button onClick={() => navigate(projectLimitReached ? '/billing' : '/projects/new')}>
            {projectLimitReached ? 'Unlock more projects' : 'New project'}
          </Button>
        }
        description="Track each venture, keep its context current, and move the next planning decision forward."
        eyebrow="Founder workspace"
        title="Dashboard"
      />

      {projectLimitReached ? (
        <Card className="border-warning/35 bg-warning/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-warning">Free project limit reached</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Activate lifetime access to create additional projects.
              </p>
            </div>
            <Button onClick={() => navigate('/billing')} variant="secondary">
              Open billing
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? <LoadingState label="Loading projects" /> : null}
      {error ? (
        <Card className="border-danger/35 bg-danger/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-danger">{error}</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Refresh the workspace or try again after checking your connection.
              </p>
            </div>
            <Button onClick={loadProjects} variant="secondary">
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error && projects.length === 0 ? (
        <EmptyState
          action={<Button onClick={() => navigate('/projects/new')}>Start onboarding</Button>}
          description="Capture the customer, launch scope, budget, timeline, and founder constraints so the workspace can recommend the right next step."
          title="Create your first project"
        />
      ) : null}

      {!isLoading && !error && projects.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Status, created date, and recommended next action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.map((project) => (
              <Link
                className="block rounded-lg border border-border bg-surface-raised p-4 transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
                key={project.id}
                to={`/projects/${project.id}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold tracking-normal text-text">
                        {project.name}
                      </h2>
                      <Badge variant={getProjectStatusVariant(project.status)}>
                        {formatStatus(project.status)}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 max-w-3xl text-sm leading-6 text-muted">
                      {project.ideaSummary ??
                        'Project context is ready to be completed before planning begins.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{project.industry ?? 'Industry not set'}</Badge>
                      <Badge>{getProjectOptionLabel.currentStage(project.currentStage)}</Badge>
                      <Badge>{getProjectOptionLabel.launchTimeline(project.launchTimeline)}</Badge>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem]">
                    <div className="rounded-md border border-border bg-surface p-3">
                      <p className="text-xs uppercase tracking-normal text-muted">Created</p>
                      <p className="mt-1 text-sm font-medium text-text">
                        {formatDate(project.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-surface p-3">
                      <p className="text-xs uppercase tracking-normal text-muted">Next action</p>
                      <p className="mt-1 text-sm font-medium leading-5 text-text">
                        {getNextAction(project)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>The founder profile attached to this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-normal text-muted">Name</p>
                <p className="mt-2 text-sm font-medium text-text">{user?.name ?? 'Not set'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-normal text-muted">Email</p>
                <p className="mt-2 break-all text-sm font-medium text-text">{user?.email}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-normal text-muted">Role</p>
                <div className="mt-2">
                  <Badge variant="accent">{user ? formatStatus(user.role) : 'Founder'}</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-normal text-muted">Plan</p>
                <div className="mt-2">
                  <Badge variant={user?.plan === 'LIFETIME' ? 'success' : 'warning'}>
                    {getPlanLabel(user?.plan)}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-normal text-muted">Created</p>
                <p className="mt-2 text-sm font-medium text-text">
                  {user ? formatDate(user.createdAt) : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace health</CardTitle>
            <CardDescription>Summary of active project context across the account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <p className="text-xs uppercase tracking-normal text-muted">Projects</p>
              <p className="mt-2 text-2xl font-semibold tracking-normal text-text">
                {projects.length}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <p className="text-xs uppercase tracking-normal text-muted">Next step</p>
              <p className="mt-2 text-sm font-medium leading-6 text-text">
                {projects.length > 0
                  ? getNextAction(projects[0])
                  : 'Complete onboarding for your first project'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
