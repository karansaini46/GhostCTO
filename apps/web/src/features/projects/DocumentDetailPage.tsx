import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  MarkdownReport,
  ReportCard,
  LoadingState,
  PageHeader,
} from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import { DocumentFeedbackPanel } from './DocumentFeedbackPanel';
import {
  exportProjectDocumentPdfRequest,
  getProjectDocumentRequest,
  getProjectRequest,
} from './project-api';
import type { Project, ProjectDocument, ProjectDocumentFeedback } from './project-types';

const exportablePdfTypes = new Set([
  'code_audit',
  'developer_jd',
  'rate_validator',
  'roadmap',
  'stack_advisor',
  'technical_spec',
  'vetting_scorecard',
]);

const documentTypeLabels: Record<string, string> = {
  code_audit: 'Code Audit',
  developer_jd: 'Developer JD',
  rate_validator: 'Rate Validator',
  roadmap: 'Roadmap',
  stack_advisor: 'Stack Advisor',
  technical_spec: 'Technical Spec',
  vetting_scorecard: 'Vetting Scorecard',
};

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getDocumentTypeLabel = (type: string) => documentTypeLabels[type] ?? formatLabel(type);

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

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

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

const downloadMarkdown = (documentRecord: ProjectDocument) => {
  const blob = new Blob([documentRecord.content ?? ''], {
    type: 'text/markdown;charset=utf-8',
  });

  downloadBlob(blob, `${slugify(documentRecord.title)}-v${documentRecord.version}.md`);
};

export const DocumentDetailPage = () => {
  const { accessToken } = useAuth();
  const { documentId, id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [documentRecord, setDocumentRecord] = useState<ProjectDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);

  const loadDocument = useCallback(async () => {
    if (!accessToken || !id || !documentId) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const [projectResponse, documentResponse] = await Promise.all([
        getProjectRequest(accessToken, id),
        getProjectDocumentRequest(accessToken, id, documentId),
      ]);

      setProject(projectResponse.project);
      setDocumentRecord(documentResponse.document);
    } catch {
      setError('Unable to load this document.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, documentId, id]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  const handleCopy = async () => {
    if (!documentRecord?.content) {
      return;
    }

    await copyText(documentRecord.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleExportPdf = async () => {
    if (!accessToken || !project || !documentRecord) {
      return;
    }

    setExportError(null);
    setIsExporting(true);

    try {
      const response = await exportProjectDocumentPdfRequest(
        accessToken,
        project.id,
        documentRecord.id,
      );
      const fallbackFilename = `${slugify(project.name)}-${slugify(documentRecord.title)}.pdf`;

      downloadBlob(response.blob, response.filename ?? fallbackFilename);
    } catch (requestError) {
      setExportError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to export this document as a PDF.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleFeedbackSaved = (feedback: ProjectDocumentFeedback) => {
    setDocumentRecord((current) =>
      current?.id === feedback.documentId ? { ...current, feedback } : current,
    );
  };

  if (isLoading) {
    return <LoadingState label="Loading document" />;
  }

  if (error || !project || !documentRecord) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={
            <Button onClick={() => navigate(`/projects/${id ?? ''}/documents`)}>Back</Button>
          }
          description={error ?? 'The requested document could not be loaded.'}
          eyebrow="Project documents"
          title="Document"
        />
        <Card className="border-danger/35 bg-danger/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted">
              The document may be unavailable, or your account may not have access.
            </p>
            <Button onClick={loadDocument} variant="secondary">
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canExportPdf =
    documentRecord.status === 'COMPLETED' &&
    Boolean(documentRecord.content?.trim()) &&
    exportablePdfTypes.has(documentRecord.type);
  const reportContent = documentRecord.content?.replace(/^#\s+.+\n+/, '');

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => navigate(`/projects/${project.id}/documents`)}
              variant="secondary"
            >
              Back to documents
            </Button>
            <Button disabled={!documentRecord.content} onClick={handleCopy} variant="secondary">
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              disabled={!documentRecord.content}
              onClick={() => downloadMarkdown(documentRecord)}
              variant="secondary"
            >
              Export Markdown
            </Button>
            {canExportPdf ? (
              <Button isLoading={isExporting} onClick={handleExportPdf}>
                Export PDF
              </Button>
            ) : null}
          </div>
        }
        description={documentRecord.summary ?? 'Saved generated document.'}
        eyebrow="Project documents"
        title="Document"
      />

      {exportError ? (
        <Card className="border-danger/35 bg-danger/5">
          <CardContent>
            <p className="text-sm leading-6 text-danger">{exportError}</p>
          </CardContent>
        </Card>
      ) : null}

      <DocumentFeedbackPanel
        accessToken={accessToken}
        document={documentRecord}
        onFeedbackSaved={handleFeedbackSaved}
        projectId={project.id}
      />

      <ReportCard
        meta={
          <>
            <Badge>{getDocumentTypeLabel(documentRecord.type)}</Badge>
            <Badge variant="accent">v{documentRecord.version}</Badge>
            <Badge>{formatLabel(documentRecord.status)}</Badge>
            <Badge>{formatDateTime(documentRecord.createdAt)}</Badge>
          </>
        }
        subtitle={
          documentRecord.completedAt
            ? `Completed ${formatDateTime(documentRecord.completedAt)}`
            : 'Saved project document.'
        }
        title={documentRecord.title}
      >
        {reportContent ? (
          <MarkdownReport content={reportContent} />
        ) : (
          <p className="text-sm leading-6 text-secondary">No content saved for this document.</p>
        )}
      </ReportCard>
    </div>
  );
};
