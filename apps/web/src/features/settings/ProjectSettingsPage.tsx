import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import {
  budgetRangeOptions,
  getProjectOptionLabel,
  stageOptions,
} from '../projects/project-options';
import {
  deleteProjectRequest,
  getProjectRequest,
  updateProjectRequest,
} from '../projects/project-api';
import type { Project, ProjectPayload } from '../projects/project-types';

type ProjectSettingsForm = {
  budgetRange: string;
  currentStage: string;
  ideaSummary: string;
  name: string;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

const toFormState = (project: Project): ProjectSettingsForm => ({
  budgetRange: project.budgetRange ?? '',
  currentStage: project.currentStage ?? '',
  ideaSummary: project.ideaSummary ?? '',
  name: project.name,
});

export const ProjectSettingsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectSettingsForm>({
    budgetRange: '',
    currentStage: '',
    ideaSummary: '',
    name: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
      setForm(toFormState(response.project));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load this project.'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const updateField = (field: keyof ProjectSettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const buildPayload = (): Partial<ProjectPayload> => {
    const payload: Partial<ProjectPayload> = {
      name: form.name.trim(),
    };
    const ideaSummary = form.ideaSummary.trim();

    if (ideaSummary || project?.ideaSummary) {
      payload.ideaSummary = ideaSummary;
    }

    if (form.currentStage || project?.currentStage) {
      payload.currentStage = form.currentStage;
    }

    if (form.budgetRange || project?.budgetRange) {
      payload.budgetRange = form.budgetRange;
    }

    return payload;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !project) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const response = await updateProjectRequest(accessToken, project.id, buildPayload());

      setProject(response.project);
      setForm(toFormState(response.project));
      setNotice('Project settings updated.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to update project settings.'));
    } finally {
      setIsSaving(false);
    }
  };

  const closeDeleteModal = () => {
    if (isDeleting) {
      return;
    }

    setDeleteConfirmation('');
    setDeleteError(null);
    setDeleteOpen(false);
  };

  const handleDeleteProject = async () => {
    if (!accessToken || !project) {
      return;
    }

    if (deleteConfirmation !== project.name) {
      setDeleteError('Type the project name exactly to delete it.');
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteProjectRequest(accessToken, project.id, deleteConfirmation);
      navigate('/workspace', { replace: true });
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to delete this project.'));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading project settings" />;
  }

  if (error && !project) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={<Button onClick={() => navigate('/workspace')}>Back to workspace</Button>}
          description={error}
          eyebrow="Project settings"
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

  if (!project) {
    return null;
  }

  const deleteDisabled = deleteConfirmation !== project.name || isDeleting;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button onClick={() => navigate(`/projects/${project.id}`)} variant="secondary">
            Back to project
          </Button>
        }
        description="Keep the core project context accurate before generating new planning documents."
        eyebrow="Project settings"
        title={project.name}
      />

      {error ? (
        <div className="rounded-md border border-danger/35 bg-danger/5 p-4 text-sm leading-6 text-danger">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-md border border-success/35 bg-success/5 p-4 text-sm leading-6 text-success">
          {notice}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Project profile</CardTitle>
            <CardDescription>
              These fields shape project summaries, planning documents, and workspace guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <Input
                label="Project name"
                maxLength={80}
                onChange={(event) => updateField('name', event.target.value)}
                required
                value={form.name}
              />
              <Select
                label="Stage"
                onChange={(event) => updateField('currentStage', event.target.value)}
                placeholder="Select a stage"
                value={form.currentStage}
              >
                {stageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Budget range"
                onChange={(event) => updateField('budgetRange', event.target.value)}
                placeholder="Select a budget range"
                value={form.budgetRange}
              >
                {budgetRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Current stage
                </p>
                <p className="mt-2 text-sm font-medium text-text">
                  {getProjectOptionLabel.currentStage(project.currentStage)}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Current budget
                </p>
                <p className="mt-2 text-sm font-medium text-text">
                  {getProjectOptionLabel.budgetRange(project.budgetRange)}
                </p>
              </div>
            </div>
            <Textarea
              label="Idea summary"
              onChange={(event) => updateField('ideaSummary', event.target.value)}
              rows={7}
              value={form.ideaSummary}
            />
          </CardContent>
          <CardFooter>
            <Button isLoading={isSaving} type="submit">
              Save project
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card className="border-danger/35">
        <CardHeader>
          <CardTitle>Delete project</CardTitle>
          <CardDescription>
            This permanently removes the project workspace and its generated work.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3 text-sm leading-6 text-muted">
            <p>
              Deleting this project removes its saved answers, generated documents, chat history,
              audit reports, quote analyses, and vetting reports. Account payments are retained and
              detached from the project record.
            </p>
            <p>This action cannot be undone.</p>
          </div>
          <Button onClick={() => setDeleteOpen(true)} variant="danger">
            Delete project
          </Button>
        </CardContent>
      </Card>

      <Link className="text-sm font-semibold text-accent hover:text-accent/80" to="/workspace">
        Back to workspace
      </Link>

      <Modal
        description="Confirm the exact project name before permanent deletion."
        footer={
          <>
            <Button disabled={isDeleting} onClick={closeDeleteModal} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={deleteDisabled}
              isLoading={isDeleting}
              onClick={handleDeleteProject}
              variant="danger"
            >
              Delete project
            </Button>
          </>
        }
        onClose={closeDeleteModal}
        open={deleteOpen}
        title="Delete project"
      >
        <div className="space-y-5">
          <div className="rounded-md border border-danger/35 bg-danger/5 p-4 text-sm leading-6 text-danger">
            This will permanently delete project context, documents, and messages for{' '}
            <span className="font-semibold">{project.name}</span>.
          </div>
          <Input
            autoComplete="off"
            error={deleteError ?? undefined}
            hint={`Type ${project.name} to confirm.`}
            label="Confirmation"
            onChange={(event) => {
              setDeleteConfirmation(event.target.value);
              setDeleteError(null);
            }}
            value={deleteConfirmation}
          />
        </div>
      </Modal>
    </div>
  );
};
