import { config } from '../../core/config.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';

const lifetimePaymentTypes = ['lifetime', 'lifetime_access'];

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addUtcDays = (date: Date, days: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

const getUsageWindow = (date = new Date()) => {
  const start = startOfUtcDay(date);

  return {
    end: addUtcDays(start, 1),
    start,
  };
};

export const hasLifetimeAccess = async (userId: string) => {
  const user = await prisma.user.findUnique({
    select: {
      plan: true,
    },
    where: { id: userId },
  });
  const payment = await prisma.payment.findFirst({
    select: {
      id: true,
    },
    where: {
      status: 'PAID',
      type: {
        in: lifetimePaymentTypes,
      },
      userId,
    },
  });

  return user?.plan === 'LIFETIME' || Boolean(payment);
};

export const getDailyGenerationUsageForUser = async (userId: string, date = new Date()) => {
  const window = getUsageWindow(date);
  const user = await prisma.user.findUnique({
    select: {
      plan: true,
    },
    where: { id: userId },
  });
  const lifetime = await prisma.payment.findFirst({
    select: {
      id: true,
    },
    where: {
      status: 'PAID',
      type: {
        in: lifetimePaymentTypes,
      },
      userId,
    },
  });
  const documentCount = await prisma.generatedDocument.count({
    where: {
      createdAt: {
        gte: window.start,
        lt: window.end,
      },
      userId,
    },
  });
  const advisorMessageCount = await prisma.chatMessage.count({
    where: {
      createdAt: {
        gte: window.start,
        lt: window.end,
      },
      role: 'ADVISOR',
      userId,
    },
  });
  const hasLifetime = user?.plan === 'LIFETIME' || Boolean(lifetime);
  const limit = hasLifetime
    ? config.lifetimeDailyGenerationLimit
    : config.unpaidDailyGenerationLimit;

  return {
    limit,
    remaining: Math.max(limit - documentCount - advisorMessageCount, 0),
    tier: hasLifetime ? 'lifetime' : 'unpaid',
    used: documentCount + advisorMessageCount,
    windowEnd: window.end,
    windowStart: window.start,
  };
};

export const enforceDailyGenerationLimitForUser = async (userId: string) => {
  const usage = await getDailyGenerationUsageForUser(userId);

  if (usage.used < usage.limit) {
    return usage;
  }

  const resetTime = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(usage.windowEnd);

  throw new ApiError(
    429,
    'DAILY_GENERATION_LIMIT_REACHED',
    `You've reached today's generation limit of ${usage.limit}. Your limit resets at ${resetTime}. Upgrade to lifetime access for a higher daily limit.`,
  );
};
