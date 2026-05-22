import type { CookieOptions } from 'express';

import { config } from '../../core/config.js';

export const googleOAuthStateCookieName = `${config.authCookieName}_google_oauth_state`;

export const getRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  path: '/',
  sameSite: config.authCookieSameSite,
  secure: config.authCookieSecure,
});

export const clearRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  path: '/',
  sameSite: config.authCookieSameSite,
  secure: config.authCookieSecure,
});

export const getGoogleOAuthStateCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  maxAge: 10 * 60 * 1000,
  path: '/auth/google/callback',
  sameSite: config.authCookieSameSite,
  secure: config.authCookieSecure,
});

export const clearGoogleOAuthStateCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  path: '/auth/google/callback',
  sameSite: config.authCookieSameSite,
  secure: config.authCookieSecure,
});
