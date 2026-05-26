import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
} from '../../components/ui';
import { ApiError } from '../../lib/api';
import { updateProfileRequest } from '../auth/auth-api';
import { useAuth } from '../auth/auth-context';
import { getPlanLabel } from '../billing/billing-plan';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const formatStatus = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getErrorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Unable to update account settings.';

export const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const { accessToken, updateUser, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const response = await updateProfileRequest(accessToken, {
        name: name.trim() || null,
      });

      updateUser(response.user);
      setNotice('Account name updated.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        description="Manage the founder profile and session attached to this workspace."
        eyebrow="Account settings"
        title="Account"
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
            <CardTitle>Founder profile</CardTitle>
            <CardDescription>
              This name is shown in the workspace and used to identify the signed-in founder.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <Input
              autoComplete="name"
              label="Name"
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder="Founder name"
              value={name}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Email</p>
                <p className="mt-2 break-all text-sm font-medium text-text">
                  {user?.email ?? 'Not available'}
                </p>
              </div>
              <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Plan</p>
                <div className="mt-2">
                  <Badge variant={user?.plan === 'LIFETIME' ? 'success' : 'warning'}>
                    {getPlanLabel(user?.plan)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button isLoading={isSaving} type="submit">
              Save account
            </Button>
          </CardFooter>
        </Card>
      </form>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>Read-only account information.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Role</p>
              <div className="mt-2">
                <Badge variant="accent">{user ? formatStatus(user.role) : 'Founder'}</Badge>
              </div>
            </div>
            <div className="rounded-panel border border-subtle bg-surface-card shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Created</p>
              <p className="mt-2 text-sm font-medium text-text">
                {user ? formatDate(user.createdAt) : 'Unknown'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>End this browser session for the current account.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted">
              Signing out clears the current session from this browser.
            </p>
            <Button onClick={() => navigate('/logout')} variant="secondary">
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
