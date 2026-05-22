import { Link, useParams } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '../../components/ui';

export const ShareDocumentPage = () => {
  const { documentId } = useParams();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        actions={
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface-raised px-4 text-sm font-medium tracking-normal text-text transition-colors hover:border-accent/35 hover:bg-surface-raised/80"
            to="/login"
          >
            Sign in
          </Link>
        }
        description="This route is a read-only scaffold for future token-protected sharing."
        eyebrow="Shared document"
        title="Document preview"
      />

      <Card>
        <CardHeader>
          <CardTitle>Read-only share view</CardTitle>
          <CardDescription>
            Access control for shared documents will be added later. For now, this page keeps the route
            shape ready for a token-backed implementation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-md border border-border bg-surface-raised p-4">
            <p className="text-xs uppercase tracking-normal text-muted">Document ID</p>
            <p className="mt-2 text-sm leading-6 text-text">{documentId ?? 'Not available'}</p>
          </div>
          <div className="rounded-md border border-border bg-surface-raised p-4">
            <p className="text-xs uppercase tracking-normal text-muted">Status</p>
            <p className="mt-2 text-sm leading-6 text-text">
              This view is intentionally static until sharing tokens are introduced.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
