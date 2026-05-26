import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ScrollText } from 'lucide-react';

import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  ErrorState,
  ExportButton,
  LoadingState,
  MarkdownReport,
  PageHeader,
  ReportCard,
  SectionHeader,
  Surface,
} from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import { GenerationLimitCallout } from './generation-errors';
import { getGenerationErrorMessage, isGenerationLimitError } from './generation-error-utils';
import {
  exportProjectDocumentPdfRequest,
  generateRoadmapRequest,
  getProjectRequest,
  listProjectDocumentsRequest,
} from './project-api';
import { getProjectOptionLabel } from './project-options';
import type { Project, ProjectDocument } from './project-types';

const progressMessages = [
  'Reading project context, budget, timeline, and launch scope.',
  'Organizing the MVP, phase two, and later-stage decisions.',
  'Checking risks, dependencies, and developer handoff notes.',
  'Preparing a shareable planning document.',
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

export const RoadmapPage = () => {
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
        listProjectDocumentsRequest(accessToken, id, 'roadmap'),
      ]);
      const sortedDocuments = sortDocuments(documentsResponse.documents);

      setProject(projectResponse.project);
      setDocuments(sortedDocuments);
      setSelectedDocumentId(sortedDocuments[0]?.id ?? null);
    } catch {
      setError('We could not load the roadmap workspace.');
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
      const response = await generateRoadmapRequest(accessToken, project.id);

      setDocuments((current) => sortDocuments([response.document, ...current]));
      setSelectedDocumentId(response.document.id);
    } catch (requestError) {
      const message = getGenerationErrorMessage(
        requestError,
        'We could not generate the roadmap right now.',
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
          : 'We could not export this roadmap as a PDF.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading roadmap workspace" />;
  }

  if (!project) {
    return (
      <ErrorState
        action={<Button onClick={() => navigate('/workspace')} variant="secondary">Back to home</Button>}
        description={error ?? 'This project may be unavailable or outside your account.'}
        title="Roadmap unavailable"
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
              {selectedDocument ? 'Regenerate roadmap' : 'Generate roadmap'}
            </Button>
          </>
        }
        description="Create a professional planning document that explains what to build first, what to delay, and what a developer needs for handoff."
        eyebrow="Plan the product"
        title="Technical Roadmap"
      />

      {!contextReady ? (
        <Surface tone="warning">
          <p className="text-sm font-semibold text-text">Project context needs attention</p>
          <p className="mt-1 text-sm leading-6 text-secondary">
            Add the project summary, customer, stage, and launch scope before creating the roadmap.
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
          action={<Button onClick={handleGenerate} variant="secondary">Try again</Button>}
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
            <p className="text-sm font-semibold text-text">Preparing the roadmap</p>
            <p className="mt-1 text-sm leading-6 text-secondary">{progressMessages[progressIndex]}</p>
          </div>
        </Surface>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          {selectedDocument?.content ? (
            <ReportCard
              actions={
                <>
                  <CopyButton disabled={!selectedDocument.content} size="sm" value={selectedDocument.content} />
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
                  <Badge>{formatDateTime(selectedDocument.completedAt ?? selectedDocument.updatedAt)}</Badge>
                </>
              }
              subtitle={selectedDocument.summary ?? 'A saved planning document for this project.'}
              title={selectedDocument.title}
            >
              {exportError ? (
                <ErrorState className="mb-6" title={exportError} />
              ) : null}
              <MarkdownReport content={selectedDocument.content} />
            </ReportCard>
          ) : (
            <EmptyState
              action={
                <Button disabled={!contextReady} isLoading={isGenerating} onClick={handleGenerate}>
                  Generate roadmap
                </Button>
              }
              className="min-h-[28rem]"
              description="Generate your first technical roadmap to see the MVP, later phases, risks, and developer handoff in one shareable document."
              title="No roadmap yet"
            />
          )}
        </div>

        <aside className="space-y-5">
          <Surface tone="soft">
            <ScrollText className="h-5 w-5 text-accent" />
            <p className="mt-3 text-sm font-semibold text-text">Project context</p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-secondary">
              <p>{getProjectOptionLabel.currentStage(project.currentStage)}</p>
              <p>{getProjectOptionLabel.budgetRange(project.budgetRange)}</p>
              <p>{getProjectOptionLabel.launchTimeline(project.launchTimeline)}</p>
            </div>
          </Surface>

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
                <p className="text-sm leading-6 text-secondary">No saved roadmap versions yet.</p>
              )}
            </div>
          </Surface>
        </aside>
      </div>
    </div>
  );
};
