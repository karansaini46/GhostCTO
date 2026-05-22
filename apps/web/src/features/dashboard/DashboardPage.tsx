import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { listProjectsRequest } from '../projects/project-api';
import {
  getProjectOptionLabel,
} from '../projects/project-options';
import type { Project } from '../projects/project-types';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;

    const loadProjects = async () => {
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

    void loadProjects();

    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <div className="space-y-8">
      <PageHeader
        actions={<Button onClick={() => navigate('/projects/new')}>New project</Button>}
        description="Keep each venture's context specific enough for useful strategy, planning, and vendor review."
        eyebrow="GhostCTO"
        title="Project workspace"
      />

      {isLoading ? <LoadingState label="Loading projects" /> : null}
      {error ? <p className="text-sm leading-6 text-danger">{error}</p> : null}

      {!isLoading && !error && projects.length === 0 ? (
        <EmptyState
          action={<Button onClick={() => navigate('/projects/new')}>Start onboarding</Button>}
          description="Capture the customer, scope, budget, timeline, and founder constraints before planning the build."
          title="Create your first project context"
        />
      ) : null}

      {!isLoading && projects.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
              key={project.id}
              to={`/projects/${project.id}`}
            >
              <Card className="h-full transition-colors hover:border-accent/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>
                        {project.industry ?? 'Industry not set'}
                      </CardDescription>
                    </div>
                    <Badge variant="accent">{project.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-4 text-sm leading-6 text-muted">
                    {project.ideaSummary ?? 'Project context has not been completed.'}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-border bg-surface-raised p-3">
                      <p className="text-xs uppercase tracking-normal text-muted">Stage</p>
                      <p className="mt-1 text-sm font-medium text-text">
                        {getProjectOptionLabel.currentStage(project.currentStage)}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-surface-raised p-3">
                      <p className="text-xs uppercase tracking-normal text-muted">Timeline</p>
                      <p className="mt-1 text-sm font-medium text-text">
                        {getProjectOptionLabel.launchTimeline(project.launchTimeline)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
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
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Name</p>
                <p className="mt-2 text-sm font-medium text-text">{user?.name ?? 'Not set'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Email</p>
                <p className="mt-2 break-all text-sm font-medium text-text">{user?.email}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Role</p>
                <div className="mt-2">
                  <Badge variant="accent">{user?.role}</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Created</p>
                <p className="mt-2 text-sm font-medium text-text">
                  {user ? new Date(user.createdAt).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Context quality</CardTitle>
            <CardDescription>Use complete project details before requesting guidance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Projects</p>
              <p className="mt-2 text-sm font-medium text-text">{projects.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Next step</p>
              <p className="mt-2 text-sm font-medium text-text">
                {projects.length > 0 ? 'Review project context' : 'Complete onboarding'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
