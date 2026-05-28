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
  Input,
  LoadingState,
  PageHeader,
  Select,
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
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

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

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesType = typeFilter ? document.type === typeFilter : true;
      const matchesQuery = normalizedQuery
        ? `${document.title} ${document.summary ?? ''} ${getDocumentTypeLabel(document.type)}`
            .toLowerCase()
            .includes(normalizedQuery)
        : true;

      return matchesType && matchesQuery;
    });
  }, [documents, query, typeFilter]);

  const groupedDocuments = useMemo(
    () =>
      filteredDocuments.reduce<Record<string, ProjectDocument[]>>((groups, document) => {
        const key = document.type;
        groups[key] = [...(groups[key] ?? []), document];
        return groups;
      }, {}),
    [filteredDocuments],
  );

  const documentTypes = useMemo(
    () => Array.from(new Set(documents.map((document) => document.type))).sort(),
    [documents],
  );

  if (isLoading) {
    return <LoadingState label="Loading documents" />;
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <PageHeader
          actions={
            <Button onClick={() => navigate(`/projects/${id ?? ''}`)}>Back to project</Button>
          }
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
        description="Review saved outputs and open earlier versions when you need the original document."
        eyebrow="Project documents"
        title={`${project.name} documents`}
      />

      <Card>
        <CardHeader>
          <CardTitle>All saved outputs</CardTitle>
          <CardDescription>
            Versions are preserved each time a document is refreshed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {documents.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-3">
                  <Input
                    label="Search documents"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by title, summary, or type"
                    value={query}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Select
                    label="Document type"
                    onChange={(event) => setTypeFilter(event.target.value)}
                    value={typeFilter}
                  >
                    <option value="">All types</option>
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>
                        {getDocumentTypeLabel(type)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              {filteredDocuments.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedDocuments).map(([type, typeDocuments]) => (
                    <section className="space-y-3" key={type}>
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-base font-semibold tracking-normal text-text">
                          {getDocumentTypeLabel(type)}
                        </h2>
                        <Badge>{typeDocuments.length} saved</Badge>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {typeDocuments.map((document) => (
                          <Link
                            className="rounded-panel border border-subtle bg-surface-card p-4 shadow-sm transition-all duration-200 ease-soft hover:border-accent/35 hover:shadow-soft flex flex-col justify-between"
                            key={document.id}
                            to={`/projects/${project.id}/documents/${document.id}`}
                          >
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
                              <p className="mt-2 text-xs leading-5 text-secondary">
                                {document.summary ?? 'No summary saved for this document.'}
                              </p>
                            </div>
                            <p className="mt-4 text-xs text-muted text-right">
                              {formatDateTime(document.createdAt)}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="Try a different search term or clear the type filter."
                  title="No matching documents"
                />
              )}
            </>
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
