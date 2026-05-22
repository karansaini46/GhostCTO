import { useNavigate } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { accessTokenExpiresAt, user } = useAuth();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={<Button onClick={() => navigate('/logout')}>Sign out</Button>}
        description="Review the account attached to this workspace."
        eyebrow="GhostCTO"
        title="Founder workspace"
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your current workspace identity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Name</p>
                <p className="mt-2 text-sm font-medium text-text">{user?.name ?? 'Not set'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Email</p>
                <p className="mt-2 break-all text-sm font-medium text-text">{user?.email}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Role</p>
                <div className="mt-2">
                  <Badge variant="accent">{user?.role}</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Created</p>
                <p className="mt-2 text-sm font-medium text-text">
                  {user ? new Date(user.createdAt).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Current sign-in status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Session expires</p>
              <p className="mt-2 text-sm font-medium text-text">
                {accessTokenExpiresAt ? new Date(accessTokenExpiresAt).toLocaleString() : 'Unknown'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Session state</p>
              <p className="mt-2 text-sm font-medium text-text">Signed in</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
