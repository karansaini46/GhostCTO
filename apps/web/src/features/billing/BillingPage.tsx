import { useCallback, useEffect, useState } from 'react';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingState,
  PageHeader,
} from '../../components/ui';
import { useAuth } from '../auth/auth-context';
import { getBillingStatusRequest } from './billing-api';
import { getPlanLabel } from './billing-plan';
import type { BillingStatus } from './billing-types';

const upgradeUrl = import.meta.env.VITE_UPGRADE_URL?.trim() || null;

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
  const { accessToken, user } = useAuth();
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

              {!hasLifetimeAccess ? (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-muted">
                    Lifetime access is applied automatically after a paid purchase is recorded for
                    your account.
                  </p>
                  {upgradeUrl ? (
                    <a
                      className="inline-flex h-10 items-center justify-center rounded-md border border-accent/70 bg-accent px-4 text-sm font-medium tracking-normal text-background transition-colors hover:bg-accent/90"
                      href={upgradeUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Upgrade to lifetime access
                    </a>
                  ) : null}
                </div>
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
