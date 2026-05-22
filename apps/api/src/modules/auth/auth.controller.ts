import type { RequestHandler } from 'express';

import { config } from '../../core/config.js';
import { ApiError } from '../../lib/api-error.js';
import { sendJson } from '../../lib/responses.js';
import {
  clearGoogleOAuthStateCookieOptions,
  clearRefreshCookieOptions,
  getGoogleOAuthStateCookieOptions,
  getRefreshCookieOptions,
  googleOAuthStateCookieName,
} from './auth.cookies.js';
import {
  buildGoogleAuthorizationUrl,
  buildGoogleFrontendRedirectUrl,
  createGoogleOAuthState,
  getGoogleOAuthProfile,
  googleOAuthFrontendErrors,
  type GoogleOAuthFrontendError,
} from './auth.oauth.js';
import { emptyBodySchema, loginSchema, registerSchema } from './auth.schemas.js';
import {
  loginUser,
  loginWithGoogleProfile,
  logoutUserSession,
  refreshUserSession,
  registerUser,
} from './auth.service.js';

const getRefreshTokenFromRequest = (request: Parameters<RequestHandler>[0]) => {
  const refreshToken = request.cookies?.[config.authCookieName];

  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  return refreshToken;
};

const getQueryValue = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;

const redirectToGoogleError = (
  response: Parameters<RequestHandler>[1],
  errorCode: GoogleOAuthFrontendError,
) => {
  response.clearCookie(googleOAuthStateCookieName, clearGoogleOAuthStateCookieOptions());
  response.redirect(buildGoogleFrontendRedirectUrl(errorCode));
};

const getGoogleCallbackError = (error: unknown): GoogleOAuthFrontendError | null => {
  if (!(error instanceof ApiError)) {
    return null;
  }

  if (error.code === 'GOOGLE_EMAIL_UNVERIFIED') {
    return googleOAuthFrontendErrors.unverified;
  }

  if (error.code === 'GOOGLE_ACCOUNT_CONFLICT') {
    return googleOAuthFrontendErrors.conflict;
  }

  if (error.code === 'GOOGLE_AUTH_INVALID' || error.code === 'GOOGLE_AUTH_UNAVAILABLE') {
    return googleOAuthFrontendErrors.invalid;
  }

  return null;
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

export const startGoogleOAuth: RequestHandler = async (_request, response, next) => {
  try {
    const state = createGoogleOAuthState();
    const authorizationUrl = buildGoogleAuthorizationUrl(state);

    response.cookie(
      googleOAuthStateCookieName,
      state,
      getGoogleOAuthStateCookieOptions(),
    );
    response.redirect(authorizationUrl);
  } catch (error) {
    next(error);
  }
};

export const handleGoogleOAuthCallback: RequestHandler = async (request, response, next) => {
  try {
    const callbackError = getQueryValue(request.query.error);

    if (callbackError === 'access_denied') {
      redirectToGoogleError(response, googleOAuthFrontendErrors.denied);
      return;
    }

    if (callbackError) {
      redirectToGoogleError(response, googleOAuthFrontendErrors.invalid);
      return;
    }

    const code = getQueryValue(request.query.code);
    const state = getQueryValue(request.query.state);
    const savedState = request.cookies?.[googleOAuthStateCookieName];

    if (
      !code ||
      !state ||
      typeof savedState !== 'string' ||
      !savedState ||
      savedState !== state
    ) {
      redirectToGoogleError(response, googleOAuthFrontendErrors.invalid);
      return;
    }

    const profile = await getGoogleOAuthProfile(code);
    const { refreshToken } = await loginWithGoogleProfile(profile);

    response.clearCookie(googleOAuthStateCookieName, clearGoogleOAuthStateCookieOptions());
    response.cookie(config.authCookieName, refreshToken, getRefreshCookieOptions());
    response.redirect(buildGoogleFrontendRedirectUrl());
  } catch (error) {
    const frontendError = getGoogleCallbackError(error);

    if (frontendError) {
      redirectToGoogleError(response, frontendError);
      return;
    }

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
