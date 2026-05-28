import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  LoadingState,
  PageHeader,
} from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import { getPlanLabel } from '../billing/billing-plan';
import { getAdminStatsRequest, lookupAdminUsersRequest } from './admin-api';
import type { AdminStats, AdminUserLookup } from './admin-types';

const statsConfig: Array<{ key: keyof AdminStats; label: string }> = [
  { key: 'users', label: 'Users' },
  { key: 'projects', label: 'Projects' },
  { key: 'generatedDocuments', label: 'Generated documents' },
  { key: 'audits', label: 'Audits' },
  { key: 'quoteAnalyses', label: 'Quote analyses' },
  { key: 'payments', label: 'Payments' },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Unable to complete the request.';
};

type UserResultProps = {
  user: AdminUserLookup;
};

const UserResult = ({ user }: UserResultProps) => (
  <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="break-all text-base font-semibold tracking-normal text-text">
            {user.email}
          </h2>
          <Badge variant={user.role === 'ADMIN' ? 'accent' : 'neutral'}>
            {formatLabel(user.role)}
          </Badge>
          <Badge variant={user.plan === 'LIFETIME' ? 'success' : 'warning'}>
            {getPlanLabel(user.plan)}
          </Badge>
        </div>
        <p className="text-sm text-muted">{user.name ?? 'Name not set'}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:w-[26rem]">
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">User ID</p>
          <p className="mt-1 break-all text-sm font-medium text-text">{user.id}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Created</p>
          <p className="mt-1 text-sm font-medium text-text">{formatDate(user.createdAt)}</p>
        </div>
      </div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Projects</p>
        <p className="mt-1 text-lg font-semibold tracking-normal text-text">
          {user.counts.projects}
        </p>
      </div>
      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Documents</p>
        <p className="mt-1 text-lg font-semibold tracking-normal text-text">
          {user.counts.generatedDocuments}
        </p>
      </div>
      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Audits</p>
        <p className="mt-1 text-lg font-semibold tracking-normal text-text">{user.counts.audits}</p>
      </div>
      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Quotes</p>
        <p className="mt-1 text-lg font-semibold tracking-normal text-text">
          {user.counts.quoteAnalyses}
        </p>
      </div>
      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Payments</p>
        <p className="mt-1 text-lg font-semibold tracking-normal text-text">
          {user.counts.payments}
        </p>
      </div>
    </div>
  </div>
);

export const AdminPage = () => {
  const { accessToken } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserLookup[]>([]);

  const loadStats = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoadingStats(true);
    setError(null);

    try {
      const response = await getAdminStatsRequest(accessToken);
      setStats(response.stats);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoadingStats(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    const query = email.trim().toLowerCase();

    if (!query) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
    setError(null);
    setUsers([]);

    try {
      const response = await lookupAdminUsersRequest(accessToken, query);
      setUsers(response.users);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        description="Review production counts and look up a founder account by email for support."
        eyebrow="Admin"
        title="Support tools"
      />

      {error ? (
        <Card className="border-danger/35 bg-danger/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-danger">{error}</p>
              <p className="mt-1 text-sm leading-6 text-muted">Try again or verify access.</p>
            </div>
            <Button onClick={loadStats} variant="secondary">
              Refresh stats
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>System counts</CardTitle>
          <CardDescription>Current production totals.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStats ? <LoadingState label="Loading admin stats" /> : null}
          {!isLoadingStats && stats ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {statsConfig.map((item) => (
                  <div
                    className="rounded-panel border border-subtle bg-surface-card p-4 shadow-sm"
                    key={item.key}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-normal text-text">
                      {stats[item.key].toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold tracking-normal text-text">
                      Document feedback
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-secondary">
                      Average rating by document type.
                    </p>
                  </div>
                  <Badge>{stats.documentFeedbackAverages.length} types rated</Badge>
                </div>
                {stats.documentFeedbackAverages.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {stats.documentFeedbackAverages.map((item) => (
                      <div
                        className="rounded-panel border border-subtle bg-surface-card p-4 shadow-sm"
                        key={item.documentType}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                          {formatLabel(item.documentType)}
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-normal text-text">
                          {item.averageRating.toFixed(2)}
                        </p>
                        <p className="mt-1 text-sm text-secondary">
                          {item.feedbackCount.toLocaleString()} ratings
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-panel border border-subtle bg-surface-card p-4 shadow-sm">
                    <p className="text-sm leading-6 text-secondary">
                      No document feedback recorded yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User lookup</CardTitle>
          <CardDescription>Search by exact email to view safe account fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSearch}>
            <div className="flex-1">
              <Input
                autoComplete="off"
                label="Founder email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="founder@example.com"
                type="email"
                value={email}
              />
            </div>
            <Button isLoading={isSearching} type="submit">
              Look up
            </Button>
          </form>

          {!isSearching && hasSearched && users.length === 0 ? (
            <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
              <p className="text-sm font-medium text-text">No matching user found.</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Check the spelling and search with the account email on file.
              </p>
            </div>
          ) : null}

          {users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user) => (
                <UserResult key={user.id} user={user} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
