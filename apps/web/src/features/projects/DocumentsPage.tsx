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
import { getProjectRequest, listProjectDocumentsRequest } from './project-api';
import type { Project, ProjectDocument } from './project-types';

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

const getStatusVariant = (status: string): BadgeProps['variant'] => {
  if (status === 'COMPLETED') {
    return 'success';
  }

  if (status === 'FAILED') {
    return 'danger';
  }

  if (status === 'PENDING' || status === 'PROCESSING') {
    return 'warning';
  }

  return 'neutral';
};

export const DocumentsPage = () => {
  const { accessToken } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!accessToken || !id) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const [projectResponse, documentsResponse] = await Promise.all([
        getProjectRequest(accessToken, id),
        listProjectDocumentsRequest(accessToken, id),
      ]);

      setProject(projectResponse.project);
      setDocuments(documentsResponse.documents);
    } catch {
      setError('Unable to load document history.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const groupedDocuments = useMemo(
    () =>
      documents.reduce<Record<string, ProjectDocument[]>>((groups, document) => {
        const key = document.type;
        groups[key] = [...(groups[key] ?? []), document];
        return groups;
      }, {}),
    [documents],
  );

  if (isLoading) {
    return <LoadingState label="Loading documents" />;
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={<Button onClick={() => navigate(`/projects/${id ?? ''}`)}>Back to project</Button>}
          description={error ?? 'Document history could not be loaded.'}
          eyebrow="Project documents"
          title="Documents"
        />
        <Card className="border-danger/35 bg-danger/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted">
              The project may be unavailable, or your account may not have access.
            </p>
            <Button onClick={loadDocuments} variant="secondary">
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
          <Button onClick={() => navigate(`/projects/${project.id}`)} variant="secondary">
            Back to project
          </Button>
        }
        description="Review generated artifacts and open earlier versions when you need the original output."
        eyebrow="Project documents"
        title={`${project.name} documents`}
      />

      <Card>
        <CardHeader>
          <CardTitle>All generated artifacts</CardTitle>
          <CardDescription>
            Versions are preserved each time a document is regenerated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedDocuments).map(([type, typeDocuments]) => (
                <section className="space-y-3" key={type}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold tracking-normal text-text">
                      {getDocumentTypeLabel(type)}
                    </h2>
                    <Badge>{typeDocuments.length} saved</Badge>
                  </div>
                  <div className="grid gap-3">
                    {typeDocuments.map((document) => (
                      <Link
                        className="rounded-md border border-border bg-surface-raised p-4 transition-colors hover:border-accent/35"
                        key={document.id}
                        to={`/projects/${project.id}/documents/${document.id}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold tracking-normal text-text">
                                {document.title}
                              </h3>
                              <Badge variant="accent">v{document.version}</Badge>
                              <Badge variant={getStatusVariant(document.status)}>
                                {formatLabel(document.status)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted">
                              {document.summary ?? 'No summary saved for this document.'}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm text-muted">
                            {formatDateTime(document.createdAt)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Generate a roadmap, stack recommendation, spec, audit, quote review, or scorecard to build document history."
              title="No documents yet"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
