import type { RequestHandler } from 'express';

import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';
import { enforceDailyGenerationLimitForUser } from '../projects/generation-usage.service.js';
import { freePlanLimits } from './billing.limits.js';

const isLifetimeUser = (request: Parameters<RequestHandler>[0]) =>
  request.user?.plan === 'LIFETIME';

const getUserId = (request: Parameters<RequestHandler>[0]) => {
  if (!request.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return request.user.id;
};

export const requireProjectCapacity: RequestHandler = async (request, _response, next) => {
  try {
    if (isLifetimeUser(request)) {
      next();
      return;
    }

    const projectCount = await prisma.project.count({
      where: {
        status: {
          not: 'ARCHIVED',
        },
        userId: getUserId(request),
      },
    });

    if (projectCount >= freePlanLimits.projects) {
      throw new ApiError(403, 'PLAN_LIMIT_REACHED', 'Upgrade to Lifetime to create more projects.');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireGenerationCapacity: RequestHandler = async (request, _response, next) => {
  try {
    await enforceDailyGenerationLimitForUser(getUserId(request));
    next();
  } catch (error) {
    next(error);
  }
};

export const requireChatCapacity: RequestHandler = async (request, _response, next) => {
  try {
    await enforceDailyGenerationLimitForUser(getUserId(request));
    next();
  } catch (error) {
    next(error);
  }
};
