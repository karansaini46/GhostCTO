import crypto from 'node:crypto';

import { z } from 'zod';

import { config } from '../../core/config.js';
import { ApiError } from '../../lib/api-error.js';
import type { GoogleOAuthProfile } from './auth.types.js';

const authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
const tokenEndpoint = 'https://oauth2.googleapis.com/token';
const userInfoEndpoint = 'https://openidconnect.googleapis.com/v1/userinfo';

const frontendErrorCodes = {
  conflict: 'google_conflict',
  denied: 'google_denied',
  invalid: 'google_invalid',
  unverified: 'google_unverified',
} as const;

export type GoogleOAuthFrontendError =
  (typeof frontendErrorCodes)[keyof typeof frontendErrorCodes];

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

const userInfoResponseSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  email_verified: z.boolean(),
  name: z.string().trim().min(1).max(120).optional(),
  picture: z.string().trim().url().max(2048).optional(),
  sub: z.string().min(1),
});

const getRequiredOAuthValue = (value: string | undefined) => {
  if (!value) {
    throw new ApiError(
      503,
      'GOOGLE_AUTH_NOT_CONFIGURED',
      'Google sign-in is not available right now.',
    );
  }

  return value;
};

const getGoogleOAuthConfig = () => ({
  callbackUrl: getRequiredOAuthValue(config.googleCallbackUrl),
  clientId: getRequiredOAuthValue(config.googleClientId),
  clientSecret: getRequiredOAuthValue(config.googleClientSecret),
});

const getGoogleFrontendRedirectUrl = () =>
  getRequiredOAuthValue(config.googleFrontendRedirectUrl);

export const createGoogleOAuthState = (): string =>
  crypto.randomBytes(32).toString('base64url');

export const buildGoogleAuthorizationUrl = (state: string): string => {
  const googleConfig = getGoogleOAuthConfig();
  const url = new URL(authorizationEndpoint);

  url.searchParams.set('access_type', 'online');
  url.searchParams.set('client_id', googleConfig.clientId);
  url.searchParams.set('redirect_uri', googleConfig.callbackUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);

  return url.toString();
};

export const buildGoogleFrontendRedirectUrl = (
  errorCode?: GoogleOAuthFrontendError,
): string => {
  const url = new URL(getGoogleFrontendRedirectUrl());

  if (errorCode) {
    url.searchParams.set('authError', errorCode);
  }

  return url.toString();
};

const parseGoogleTokenResponse = async (response: Response) => {
  const payload: unknown = await response.json();
  const result = tokenResponseSchema.safeParse(payload);

  if (!result.success) {
    throw new ApiError(401, 'GOOGLE_AUTH_INVALID', 'Google sign-in could not be completed.');
  }

  return result.data;
};

const exchangeGoogleAuthorizationCode = async (code: string): Promise<string> => {
  const googleConfig = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    client_id: googleConfig.clientId,
    client_secret: googleConfig.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: googleConfig.callbackUrl,
  });

  let response: Response;

  try {
    response = await fetch(tokenEndpoint, {
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    });
  } catch {
    throw new ApiError(
      502,
      'GOOGLE_AUTH_UNAVAILABLE',
      'Google sign-in is temporarily unavailable.',
    );
  }

  if (!response.ok) {
    throw new ApiError(401, 'GOOGLE_AUTH_INVALID', 'Google sign-in could not be completed.');
  }

  const tokenResponse = await parseGoogleTokenResponse(response);

  return tokenResponse.access_token;
};

const fetchGoogleProfile = async (accessToken: string): Promise<GoogleOAuthProfile> => {
  let response: Response;

  try {
    response = await fetch(userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new ApiError(
      502,
      'GOOGLE_AUTH_UNAVAILABLE',
      'Google sign-in is temporarily unavailable.',
    );
  }

  if (!response.ok) {
    throw new ApiError(401, 'GOOGLE_AUTH_INVALID', 'Google sign-in could not be completed.');
  }

  const payload: unknown = await response.json();
  const result = userInfoResponseSchema.safeParse(payload);

  if (!result.success) {
    throw new ApiError(401, 'GOOGLE_AUTH_INVALID', 'Google sign-in could not be completed.');
  }

  return {
    avatarUrl: result.data.picture ?? null,
    email: result.data.email,
    emailVerified: result.data.email_verified,
    id: result.data.sub,
    name: result.data.name ?? null,
  };
};

export const getGoogleOAuthProfile = async (code: string): Promise<GoogleOAuthProfile> => {
  const accessToken = await exchangeGoogleAuthorizationCode(code);

  return fetchGoogleProfile(accessToken);
};

export const googleOAuthFrontendErrors = frontendErrorCodes;
