import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingState,
  PageHeader,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { getProjectRequest } from './project-api';
import { getProjectOptionLabel } from './project-options';
import type { Project, ProjectAnswer } from './project-types';

const formatDate = (value: string) => new Date(value).toLocaleDateString();

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

export const ProjectDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!accessToken || !id) {
      return;
    }

    let active = true;

    const loadProject = async () => {
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

    void loadProject();

    return () => {
      active = false;
    };
  }, [accessToken, id]);

  if (isLoading) {
    return <LoadingState label="Loading project" />;
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={<Button onClick={() => navigate('/')}>Back to workspace</Button>}
          description={error ?? 'Project not found.'}
          eyebrow="Project context"
          title="Unable to load project"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button onClick={() => navigate('/projects/new')} variant="secondary">
            New project
          </Button>
        }
        description={`Created ${formatDate(project.createdAt)}. Last updated ${formatDate(project.updatedAt)}.`}
        eyebrow="Project context"
        title={project.name}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">{project.status}</Badge>
        <Badge>{project.industry ?? 'Industry not set'}</Badge>
        <Badge>{getProjectOptionLabel.currentStage(project.currentStage)}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Core context</CardTitle>
            <CardDescription>The foundation used for planning and execution decisions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailBlock label="Idea summary" value={project.ideaSummary} />
            <DetailBlock label="Target customer" value={project.targetCustomer} />
            <DetailBlock label="Biggest concern" value={project.biggestConcern} />
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
          <CardTitle>Launch scope</CardTitle>
          <CardDescription>The must-have feature set saved from onboarding.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {project.mustHaveFeatures.length > 0 ? (
              project.mustHaveFeatures.map((feature) => (
                <div
                  className="rounded-md border border-border bg-surface-raised p-4 text-sm leading-6 text-text"
                  key={feature}
                >
                  {feature}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No must-have features saved.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved answers</CardTitle>
          <CardDescription>Every onboarding answer is stored with the project record.</CardDescription>
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

      <Link className="text-sm font-medium text-accent hover:text-accent/80" to="/">
        Back to workspace
      </Link>
    </div>
  );
};
