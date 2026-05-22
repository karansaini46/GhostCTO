import type { RequestHandler } from 'express';

import { config } from '../../core/config.js';
import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import { clearRefreshCookieOptions, getRefreshCookieOptions } from './auth.cookies.js';
import { emptyBodySchema, loginSchema, registerSchema } from './auth.schemas.js';
import { loginUser, logoutUserSession, refreshUserSession, registerUser } from './auth.service.js';

const getRefreshTokenFromRequest = (request: Parameters<RequestHandler>[0]) => {
  const refreshToken = request.cookies?.[config.authCookieName];

  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return refreshToken;
};

export const register: RequestHandler = async (request, response, next) => {
  try {
    const input = registerSchema.parse(request.body);
    const { refreshToken, session } = await registerUser(input);

    response.cookie(config.authCookieName, refreshToken, getRefreshCookieOptions());
    sendJson(response, session, 201);
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const { refreshToken, session } = await loginUser(input);

    response.cookie(config.authCookieName, refreshToken, getRefreshCookieOptions());
    sendJson(response, session);
  } catch (error) {
    next(error);
  }
};

export const refresh: RequestHandler = async (request, response, next) => {
  try {
    emptyBodySchema.parse(request.body ?? {});
    const refreshToken = getRefreshTokenFromRequest(request);
    const { refreshToken: nextRefreshToken, session } = await refreshUserSession(refreshToken);

    response.cookie(config.authCookieName, nextRefreshToken, getRefreshCookieOptions());
    sendJson(response, session);
  } catch (error) {
    response.clearCookie(config.authCookieName, clearRefreshCookieOptions());
    next(error);
  }
};

export const logout: RequestHandler = async (request, response, next) => {
  try {
    emptyBodySchema.parse(request.body ?? {});
    const refreshToken = request.cookies?.[config.authCookieName];

    if (typeof refreshToken === 'string' && refreshToken) {
      await logoutUserSession(refreshToken);
    }

    response.clearCookie(config.authCookieName, clearRefreshCookieOptions());
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
    }

    sendJson(response, { user: request.user });
  } catch (error) {
    next(error);
  }
};
