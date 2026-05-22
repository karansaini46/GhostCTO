import type { CookieOptions } from 'express';

import { config } from '../../core/config.js';

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
