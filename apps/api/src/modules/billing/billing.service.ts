import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';
import { getDailyGenerationUsageForUser } from '../projects/generation-usage.service.js';
import { freePlanLimits } from './billing.limits.js';

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

  const [projects, dailyUsage] = await Promise.all([
    prisma.project.count({
      where: {
        status: {
          not: 'ARCHIVED',
        },
        userId,
      },
    }),
    getDailyGenerationUsageForUser(userId),
  ]);

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
