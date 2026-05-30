import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, RefreshCw } from 'lucide-react';

import {
  Badge,
  Button,
  CopyButton,
  ErrorState,
  ExportButton,
  LoadingState,
  MarkdownReport,
  PageHeader,
  ReportCard,
  SectionHeader,
  Surface,
  ModulePageShell,
  ModuleInputPanel,
  ModuleOutputPanel,
  HelpfulEmptyState,
  ProjectContextCard,
} from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import { GenerationLimitCallout } from './generation-errors';
import { getGenerationErrorMessage, isGenerationLimitError } from './generation-error-utils';
import {
  createDeveloperJdRequest,
  exportProjectDocumentPdfRequest,
  getProjectRequest,
  listProjectDocumentsRequest,
} from './project-api';
import { getProjectOptionLabel } from './project-options';
import type { Project, ProjectDocument } from './project-types';

const progressMessages = [
  'Reading project goals, scope, budget, and delivery constraints.',
  'Translating the project into hiring expectations and skill signals.',
  'Preparing interview questions, red flags, and a practical test task.',
  'Saving a developer-ready hiring brief.',
];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const slugify = (value: string) =>
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

const sortDocuments = (documents: ProjectDocument[]) =>
  [...documents].sort(
    (left, right) =>
      new Date(right.completedAt ?? right.updatedAt).getTime() -
      new Date(left.completedAt ?? left.updatedAt).getTime(),
  );

export const DeveloperJdPage = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { id } = useParams();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setError(null);
    setLimitMessage(null);
    setIsLoading(true);

    try {
      const [projectResponse, documentsResponse] = await Promise.all([
        getProjectRequest(accessToken, id),
        listProjectDocumentsRequest(accessToken, id, 'developer_jd'),
      ]);
      const sortedDocuments = sortDocuments(documentsResponse.documents);

      setProject(projectResponse.project);
      setDocuments(sortedDocuments);
      setSelectedDocumentId(sortedDocuments[0]?.id ?? null);
    } catch {
      setError('We could not load the developer brief workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!isGenerating) {
      setProgressIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setProgressIndex((current) => (current + 1) % progressMessages.length);
    }, 1300);

    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null,
    [documents, selectedDocumentId],
  );

  const handleGenerate = async () => {
    if (!accessToken || !project) {
      return;
    }

    setError(null);
    setExportError(null);
    setLimitMessage(null);
    setIsGenerating(true);

    try {
      const response = await createDeveloperJdRequest(accessToken, project.id);

      setDocuments((current) => sortDocuments([response.document, ...current]));
      setSelectedDocumentId(response.document.id);
    } catch (requestError) {
      const message = getGenerationErrorMessage(
        requestError,
        'We could not create the developer brief right now.',
      );

      setError(message);
      setLimitMessage(isGenerationLimitError(requestError) ? message : null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!accessToken || !project || !selectedDocument) {
      return;
    }

    setExportError(null);
    setIsExporting(true);

    try {
      const response = await exportProjectDocumentPdfRequest(
        accessToken,
        project.id,
        selectedDocument.id,
      );
      const fallbackFilename = `${slugify(project.name)}-${slugify(selectedDocument.title)}.pdf`;

      downloadBlob(response.blob, response.filename ?? fallbackFilename);
    } catch (requestError) {
      setExportError(
        requestError instanceof ApiError
          ? requestError.message
          : 'We could not export this developer brief as a PDF.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading developer brief workspace" />;
  }

  if (!project) {
    return (
      <ErrorState
        action={
          <Button onClick={() => navigate('/workspace')} variant="secondary">
            Back to home
          </Button>
        }
        description={error ?? 'This project may be unavailable or outside your account.'}
        title="Developer brief unavailable"
      />
    );
  }

  const contextReady = Boolean(
    project.ideaSummary &&
    project.targetCustomer &&
    project.currentStage &&
    project.mustHaveFeatures.length > 0,
  );
  const canExportPdf =
    selectedDocument?.status === 'COMPLETED' && Boolean(selectedDocument.content?.trim());

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button
              leftIcon={<ArrowLeft />}
              onClick={() => navigate(`/projects/${project.id}`)}
              variant="secondary"
            >
              Project room
            </Button>
            <Button
              disabled={!contextReady}
              isLoading={isGenerating}
              leftIcon={<RefreshCw />}
              onClick={handleGenerate}
            >
              {selectedDocument ? 'Regenerate brief' : 'Create brief'}
            </Button>
          </>
        }
        description="Turn the saved project context into a hiring brief with role scope, must-have skills, interview questions, test task, and red flags."
        eyebrow="Hire safely"
        title="Developer Brief"
      />

      {!contextReady ? (
        <Surface tone="warning">
          <p className="text-sm font-semibold text-text">Project context needs attention</p>
          <p className="mt-1 text-sm leading-6 text-secondary">
            Complete the project context before creating a hiring brief for a developer or agency.
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate(`/projects/${project.id}/settings`)}
            size="sm"
            variant="secondary"
          >
            Review context
          </Button>
        </Surface>
      ) : null}

      {limitMessage ? <GenerationLimitCallout message={limitMessage} /> : null}

      {error && !limitMessage ? (
        <ErrorState
          action={
            <Button onClick={handleGenerate} variant="secondary">
              Try again
            </Button>
          }
          description="Your project is still saved. Try again in a moment."
          title={error}
        />
      ) : null}

      {isGenerating ? (
        <Surface className="flex items-center gap-4" tone="accent">
          <span className="relative h-10 w-10 shrink-0 rounded-full border border-accent/20 bg-surface-card">
            <span className="absolute inset-2 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          </span>
          <div>
            <p className="text-sm font-semibold text-text">Preparing the developer brief</p>
            <p className="mt-1 text-sm leading-6 text-secondary">
              {progressMessages[progressIndex]}
            </p>
          </div>
        </Surface>
      ) : null}

      <ModulePageShell>
        <ModuleInputPanel colSpan="col-span-12 xl:col-span-4">
          <ProjectContextCard project={project} />

          <Surface tone="default">
            <SectionHeader
              description="Older versions stay available when you regenerate."
              title="History"
            />
            <div className="mt-4 space-y-2">
              {documents.length > 0 ? (
                documents.map((document) => (
                  <button
                    className={
                      document.id === selectedDocument?.id
                        ? 'w-full rounded-md border border-accent bg-accent-soft p-3 text-left text-sm font-semibold text-text'
                        : 'w-full rounded-md border border-subtle bg-surface-card p-3 text-left text-sm font-semibold text-secondary transition-colors hover:border-accent/35 hover:text-text'
                    }
                    key={document.id}
                    onClick={() => setSelectedDocumentId(document.id)}
                    type="button"
                  >
                    <span className="block">{document.title}</span>
                    <span className="mt-1 block text-xs text-muted">
                      v{document.version} · {formatDateTime(document.createdAt)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm leading-6 text-secondary">No saved brief versions yet.</p>
              )}
            </div>
          </Surface>
        </ModuleInputPanel>

        <ModuleOutputPanel colSpan="col-span-12 xl:col-span-8">
          {selectedDocument?.content ? (
            <ReportCard
              actions={
                <>
                  <CopyButton
                    disabled={!selectedDocument.content}
                    size="sm"
                    value={selectedDocument.content}
                  />
                  <ExportButton
                    disabled={!canExportPdf}
                    isLoading={isExporting}
                    label="Export PDF"
                    onClick={handleExportPdf}
                    size="sm"
                  />
                </>
              }
              meta={
                <>
                  <Badge>v{selectedDocument.version}</Badge>
                  <Badge>{selectedDocument.status.toLowerCase()}</Badge>
                  <Badge>
                    {formatDateTime(selectedDocument.completedAt ?? selectedDocument.updatedAt)}
                  </Badge>
                </>
              }
              subtitle={selectedDocument.summary ?? 'A saved hiring document for this project.'}
              title={selectedDocument.title}
            >
              {exportError ? <ErrorState className="mb-6" title={exportError} /> : null}
              <MarkdownReport content={selectedDocument.content} />
            </ReportCard>
          ) : (
            <HelpfulEmptyState
              action={
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted">Ready to brief a developer?</p>
                  <Button disabled={!contextReady} isLoading={isGenerating} onClick={handleGenerate}>
                    Create developer brief
                  </Button>
                </div>
              }
              description="A ready-to-publish developer brief tailored to your project architecture and timeline."
              previewSections={[
                {
                  desc: 'Sleek, compelling position summary showing project context, candidate goals, and company mission.',
                  title: 'Job Posting Copy & Intro',
                },
                {
                  desc: 'Precise mapping of must-have tech stack skills, development workflows, and preferred background.',
                  title: 'Tech Stack & Required Skills',
                },
                {
                  desc: 'Custom questions to ask candidates during phone calls or technical evaluations with expected strong signals.',
                  title: 'Interview Screening Questions',
                },
                {
                  desc: 'A short, relevant, and objective coding challenge to assess candidate proficiency and communication style.',
                  title: 'Practical Coding Test Task',
                },
              ]}
              title="Expected Developer Brief & JD Output"
              whatItDoes="Turns the saved project context into a professional hiring brief with role scope, must-have skills, screening questions, a test task, and agency red flags."
              whatToProvide={[
                'Product idea summary and target audience',
                'Hiring context (stage, budget, timelines)',
                'A saved tech stack recommendation from Stack Advisor',
              ]}
              whatYouGet={[
                'Job Posting Copy: Compelling intro showing project context and goals',
                'Tech Stack Skills: Precise mapping of must-have skills and preferred backgrounds',
                'Screening Questions: Custom questions to ask during phone calls',
                'Practical Coding Task: Short, relevant coding challenge to assess proficiency',
              ]}
            />
          )}
        </ModuleOutputPanel>
      </ModulePageShell>
    </div>
  );
};
