import { FormEvent, useCallback, useEffect, useState } from 'react';

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
  <div className="rounded-md border border-border bg-surface-raised p-4">
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-medium text-text">{label}</p>
      <p className="text-sm text-muted">
        {used} / {limit}
      </p>
    </div>
    <div className="mt-3 h-2 rounded-full bg-border">
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
        description="Manage access for projects, documents, and chat usage."
        eyebrow="Billing"
        title="Plan and access"
      />

      {isLoading ? <LoadingState label="Loading billing details" /> : null}

      {!isLoading ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Current plan</CardTitle>
              <CardDescription>Lifetime access removes the free plan limits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={hasLifetimeAccess ? 'success' : 'warning'}>
                  {getPlanLabel(currentPlan)}
                </Badge>
                {hasLifetimeAccess ? (
                  <p className="text-sm font-medium text-success">
                    Lifetime access activated
                  </p>
                ) : (
                  <p className="text-sm text-muted">Free plan limits are active.</p>
                )}
              </div>

              {success ? (
                <div className="rounded-md border border-success/35 bg-success/5 p-4 text-sm font-medium text-success">
                  Lifetime access activated
                </div>
              ) : null}

              {error ? (
                <div className="rounded-md border border-danger/35 bg-danger/5 p-4 text-sm font-medium text-danger">
                  {error}
                </div>
              ) : null}

              {!hasLifetimeAccess ? (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <Input
                    autoComplete="off"
                    label="License key"
                    onChange={(event) => setLicenseKey(event.target.value)}
                    placeholder="Paste your license key"
                    value={licenseKey}
                  />
                  <Button disabled={!licenseKey.trim()} isLoading={isSubmitting} type="submit">
                    Activate Lifetime Access
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>Daily generation usage resets at the end of the UTC day.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <UsageRow
                label="Projects"
                limit={billingStatus?.limits.projects ?? 1}
                used={billingStatus?.usage.projects ?? 0}
              />
              <UsageRow
                label="Daily generations"
                limit={billingStatus?.limits.generations ?? 3}
                used={billingStatus?.usage.generations ?? 0}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
