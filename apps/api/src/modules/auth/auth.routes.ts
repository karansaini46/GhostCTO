import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { config } from '../../core/config.js';
import { ApiError } from '../../lib/api-error.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { authenticateRequest, requireAuth } from '../../middleware/auth.js';
import {
  handleGoogleOAuthCallback,
  login,
  logout,
  me,
  refresh,
  register,
  startGoogleOAuth,
  updateMe,
} from './auth.controller.js';

const buildRateLimiter = (windowMs: number, limit: number) =>
  rateLimit({
    handler: (_request, _response, next) => {
      next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many authentication attempts.'));
    },
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    windowMs,
  });

const authMutationLimiter = buildRateLimiter(config.authRateLimitWindowMs, config.authRateLimitMax);
const authSessionLimiter = buildRateLimiter(
  config.authSessionRateLimitWindowMs,
  config.authSessionRateLimitMax,
);

export const authRouter = Router();

authRouter.post('/register', authMutationLimiter, asyncHandler(register));
authRouter.post('/login', authMutationLimiter, asyncHandler(login));
authRouter.get('/google', authMutationLimiter, asyncHandler(startGoogleOAuth));
authRouter.get('/google/callback', authMutationLimiter, asyncHandler(handleGoogleOAuthCallback));
authRouter.post('/refresh', authSessionLimiter, asyncHandler(refresh));
authRouter.post('/logout', authSessionLimiter, asyncHandler(logout));
authRouter.get('/me', authSessionLimiter, authenticateRequest, requireAuth, asyncHandler(me));
authRouter.patch(
  '/me',
  authMutationLimiter,
  authenticateRequest,
  requireAuth,
  asyncHandler(updateMe),
);
