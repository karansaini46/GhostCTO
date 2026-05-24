import type { RequestHandler } from 'express';

import { ApiError } from '../lib/api-error.js';
import { authenticateAccessToken } from '../modules/auth/auth.service.js';

export const authenticateRequest: RequestHandler = async (request, _response, next) => {
  try {
    const user = await authenticateAccessToken(request.headers.authorization);

    if (user) {
      request.user = user;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth: RequestHandler = (request, _response, next) => {
  if (!request.user) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required.'));
    return;
  }

  next();
};

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (!request.user) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required.'));
    return;
  }

  if (request.user.role !== 'ADMIN') {
    next(new ApiError(403, 'FORBIDDEN', 'Admin access required.'));
    return;
  }

  next();
};
