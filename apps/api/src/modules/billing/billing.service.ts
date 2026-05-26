import crypto from 'node:crypto';

import { config } from '../../core/config.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';
import { getDailyGenerationUsageForUser } from '../projects/generation-usage.service.js';
import { freePlanLimits } from './billing.limits.js';
import type { LicenseVerificationInput } from './billing.schemas.js';
import type { SafeUser } from '../auth/auth.types.js';
import type { Prisma } from '../../generated/prisma/client.js';

type GumroadLicenseVerificationResponse = {
  purchase?: {
    amount_refunded?: number | null;
    chargebacked?: boolean | null;
    currency?: string | null;
    disputed?: boolean | null;
    dispute_won?: boolean | null;
    email?: string | null;
    id?: string | null;
    license_key?: string | null;
    price?: number | string | null;
    product_id?: string | null;
    refunded?: boolean | null;
    sale_id?: string | null;
    sale_timestamp?: string | null;
    purchaser_id?: string | null;
    subscription_cancelled_at?: string | null;
    subscription_ended_at?: string | null;
    subscription_failed_at?: string | null;
  } | null;
  success?: boolean;
  uses?: number;
};

const safeUserSelect = {
  avatarUrl: true,
  createdAt: true,
  email: true,
  id: true,
  name: true,
  plan: true,
  role: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const toSafeUser = (user: Prisma.UserGetPayload<{ select: typeof safeUserSelect }>): SafeUser => ({
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt.toISOString(),
  email: user.email,
  id: user.id,
  name: user.name,
  plan: user.plan,
  role: user.role,
  updatedAt: user.updatedAt.toISOString(),
});

const toCurrencyCode = (value: string | null | undefined) => value?.trim().toUpperCase() || 'USD';

const getGumroadProductId = () => {
  if (!config.gumroadProductId) {
    throw new ApiError(
      500,
      'BILLING_NOT_CONFIGURED',
      'Billing is not configured for this environment.',
    );
  }

  return config.gumroadProductId;
};

const verifyGumroadLicense = async (
  licenseKey: string,
): Promise<GumroadLicenseVerificationResponse> => {
  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    body: new URLSearchParams({
      increment_uses_count: 'false',
      license_key: licenseKey,
      product_id: getGumroadProductId(),
    }),
    method: 'POST',
  });

  if (response.status === 404) {
    throw new ApiError(400, 'INVALID_LICENSE_KEY', 'Invalid license key.');
  }

  if (!response.ok) {
    throw new ApiError(502, 'BILLING_PROVIDER_ERROR', 'Unable to verify the license key.');
  }

  return (await response.json()) as GumroadLicenseVerificationResponse;
};

const hashLicenseKey = (licenseKey: string) =>
  crypto.createHash('sha256').update(licenseKey).digest('hex');

const getLicenseKeyLast4 = (licenseKey: string) => licenseKey.trim().slice(-4);

const getPaymentProviderId = (
  purchase: NonNullable<GumroadLicenseVerificationResponse['purchase']>,
  licenseKey: string,
) => purchase.sale_id ?? purchase.id ?? `license:${hashLicenseKey(licenseKey)}`;

const toAmountCents = (purchase: NonNullable<GumroadLicenseVerificationResponse['purchase']>) => {
  const amount = Number(purchase.price ?? 0);

  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
};

const toSerializablePurchase = (
  purchase: NonNullable<GumroadLicenseVerificationResponse['purchase']>,
) => {
  const serialized = JSON.parse(JSON.stringify(purchase)) as Record<string, unknown>;

  delete serialized.license_key;

  return serialized;
};

const isActivePurchase = (purchase: NonNullable<GumroadLicenseVerificationResponse['purchase']>) =>
  !purchase.refunded &&
  !purchase.disputed &&
  !purchase.chargebacked &&
  !purchase.subscription_cancelled_at &&
  !purchase.subscription_ended_at &&
  !purchase.subscription_failed_at;

export const getBillingStatusForUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    select: {
      plan: true,
    },
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  const projects = await prisma.project.count({
    where: {
      status: {
        not: 'ARCHIVED',
      },
      userId,
    },
  });
  const dailyUsage = await getDailyGenerationUsageForUser(userId);

  const hasLifetimeAccess = dailyUsage.tier === 'lifetime';
  const plan = hasLifetimeAccess ? 'LIFETIME' : user.plan;

  return {
    access: {
      canCreateProject: hasLifetimeAccess || projects < freePlanLimits.projects,
      canGenerate: dailyUsage.remaining > 0,
      canUseChat: dailyUsage.remaining > 0,
    },
    limits: {
      chatMessages: dailyUsage.limit,
      generations: dailyUsage.limit,
      projects: freePlanLimits.projects,
    },
    plan,
    usage: {
      chatMessages: dailyUsage.used,
      generations: dailyUsage.used,
      projects,
    },
  };
};

export const verifyLicenseForUser = async (userId: string, input: LicenseVerificationInput) => {
  const gumroadResponse = await verifyGumroadLicense(input.licenseKey);

  if (!gumroadResponse.success || !gumroadResponse.purchase) {
    throw new ApiError(400, 'INVALID_LICENSE_KEY', 'Invalid license key.');
  }

  const purchase = gumroadResponse.purchase;

  if (!isActivePurchase(purchase)) {
    throw new ApiError(400, 'INVALID_LICENSE_KEY', 'Invalid license key.');
  }

  const now = new Date();
  const providerPaymentId = getPaymentProviderId(purchase, input.licenseKey);
  const amountCents = toAmountCents(purchase);
  const currency = toCurrencyCode(purchase.currency);
  const metadata = {
    licenseKeyHash: hashLicenseKey(input.licenseKey),
    licenseKeyLast4: getLicenseKeyLast4(input.licenseKey),
    purchase: toSerializablePurchase(purchase),
    verifiedAt: now.toISOString(),
  } as Prisma.InputJsonValue;

  const [user, payment] = await prisma.$transaction(async (transaction) => {
    const existingPayment = await transaction.payment.findUnique({
      select: {
        id: true,
        userId: true,
      },
      where: {
        provider_providerPaymentId: {
          provider: 'GUMROAD',
          providerPaymentId,
        },
      },
    });

    if (existingPayment && existingPayment.userId !== userId) {
      throw new ApiError(
        409,
        'LICENSE_ALREADY_REDEEMED',
        'This license key is already linked to another account.',
      );
    }

    const updatedUser = await transaction.user.update({
      data: {
        plan: 'LIFETIME',
      },
      select: safeUserSelect,
      where: {
        id: userId,
      },
    });

    const paymentData = {
      amountCents,
      currency,
      metadata,
      paidAt: now,
      providerCustomerId: purchase.purchaser_id ?? purchase.email ?? null,
      providerProductId: purchase.product_id ?? null,
      status: 'PAID' as const,
      type: 'lifetime_access',
      userId,
    };

    const savedPayment = existingPayment
      ? await transaction.payment.update({
          data: paymentData,
          where: {
            id: existingPayment.id,
          },
        })
      : await transaction.payment.create({
          data: {
            ...paymentData,
            provider: 'GUMROAD',
            providerPaymentId,
          },
        });

    return [updatedUser, savedPayment] as const;
  });

  return {
    billingStatus: await getBillingStatusForUser(userId),
    payment: {
      amountCents: payment.amountCents,
      createdAt: payment.createdAt.toISOString(),
      currency: payment.currency,
      id: payment.id,
      paidAt: payment.paidAt?.toISOString() ?? null,
      status: payment.status,
      type: payment.type,
      updatedAt: payment.updatedAt.toISOString(),
    },
    user: toSafeUser(user),
  };
};
