import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  LoadingState,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import { getBillingStatusRequest, verifyLicenseRequest } from './billing-api';
import { getPlanLabel } from './billing-plan';
import type { BillingStatus } from './billing-types';

const usagePercent = (used: number, limit: number) => {
  if (limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((used / limit) * 100));
};

type UsageRowProps = {
  label: string;
  limit: number;
  used: number;
};

const UsageRow = ({ label, limit, used }: UsageRowProps) => (
  <div className="rounded-panel border border-subtle bg-surface-card p-4">
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-semibold text-text">{label}</p>
      <p className="text-sm text-muted">
        {used} / {limit}
      </p>
    </div>
    <div className="mt-3 h-2 rounded-full bg-surface-soft">
      <div
        className="h-2 rounded-full bg-accent"
        style={{ width: `${usagePercent(used, limit)}%` }}
      />
    </div>
  </div>
);

export const BillingPage = () => {
  const { accessToken, updateUser, user } = useAuth();
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [success, setSuccess] = useState(false);

  const loadBillingStatus = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await getBillingStatusRequest(accessToken);
      setBillingStatus(response.billingStatus);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadBillingStatus();
  }, [loadBillingStatus]);

  const currentPlan = billingStatus?.plan ?? user?.plan ?? 'FREE';
  const hasLifetimeAccess = currentPlan === 'LIFETIME';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await verifyLicenseRequest(accessToken, licenseKey);

      updateUser(response.user);
      setBillingStatus(response.billingStatus);
      setLicenseKey('');
      setSuccess(true);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.message === 'Invalid license key') {
        setError('Invalid license key');
      } else {
        setError('Unable to activate lifetime access.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        description="Review your plan, activate lifetime access, and see current usage without noisy pricing tables."
        eyebrow="Billing"
        title="Plan and access"
      />

      {isLoading ? <LoadingState label="Loading billing details" /> : null}

      {!isLoading ? (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Surface className="p-6 sm:p-7" tone="elevated">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge variant={hasLifetimeAccess ? 'success' : 'warning'}>
                  {getPlanLabel(currentPlan)}
                </Badge>
                <h2 className="mt-4 font-editorial text-4xl font-semibold text-text">
                  {hasLifetimeAccess ? 'Lifetime access is active.' : 'Activate lifetime access.'}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
                  {hasLifetimeAccess
                    ? 'Your workspace has the paid access attached to this account.'
                    : 'Unlock more room for project planning, documents, and project-aware conversations.'}
                </p>
              </div>
              <div className="rounded-panel border border-accent/20 bg-accent-soft p-4 lg:w-72">
                <p className="text-sm font-semibold text-text">Included</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-secondary">
                  {['Project planning tools', 'Founder-readable reports', 'Export where supported'].map((item) => (
                    <li className="flex gap-2" key={item}>
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {success ? (
              <div className="mt-5 rounded-panel border border-success/25 bg-success/10 p-4 text-sm font-semibold text-success">
                Lifetime access activated.
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-panel border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">
                {error}
              </div>
            ) : null}

            {!hasLifetimeAccess ? (
              <form className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end" onSubmit={handleSubmit}>
                <Input
                  autoComplete="off"
                  label="License key"
                  onChange={(event) => setLicenseKey(event.target.value)}
                  placeholder="Paste your license key"
                  value={licenseKey}
                />
                <Button
                  disabled={!licenseKey.trim()}
                  isLoading={isSubmitting}
                  leftIcon={<KeyRound />}
                  type="submit"
                >
                  Activate
                </Button>
              </form>
            ) : null}
          </Surface>

          <Card>
            <CardContent className="space-y-5">
              <SectionHeader
                description="Daily document and chat usage resets at the end of the UTC day."
                title="Usage"
              />
              <div className="grid gap-4">
                <UsageRow
                  label="Projects"
                  limit={billingStatus?.limits.projects ?? 1}
                  used={billingStatus?.usage.projects ?? 0}
                />
                <UsageRow
                  label="Daily documents"
                  limit={billingStatus?.limits.generations ?? 3}
                  used={billingStatus?.usage.generations ?? 0}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
