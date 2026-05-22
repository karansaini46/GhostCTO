import crypto from 'node:crypto';

import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import { config } from '../../core/config.js';
import type { SafeUser } from './auth.types.js';

const getAccessTokenSecret = () => {
  if (!config.accessTokenSecret) {
    throw new Error('JWT_SECRET is required.');
  }

  return config.accessTokenSecret;
};

export type AccessTokenPayload = {
  email: string;
  role: SafeUser['role'];
  tokenType: 'access';
};

export const createAccessToken = (user: SafeUser): string =>
  jwt.sign(
    {
      email: user.email,
      role: user.role,
      tokenType: 'access' as const,
    } satisfies AccessTokenPayload,
    getAccessTokenSecret(),
    {
      audience: config.accessTokenAudience,
      expiresIn: config.accessTokenExpiresIn as SignOptions['expiresIn'],
      issuer: config.accessTokenIssuer,
      subject: user.id,
    },
  );

export const verifyAccessToken = (token: string): { userId: string } => {
  const payload = jwt.verify(token, getAccessTokenSecret(), {
    audience: config.accessTokenAudience,
    issuer: config.accessTokenIssuer,
  }) as JwtPayload & AccessTokenPayload;

  if (payload.tokenType !== 'access' || typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Invalid access token.');
  }

  return { userId: payload.sub };
};

export const getAccessTokenExpiresAt = (token: string): string => {
  const decoded = jwt.decode(token);

  if (typeof decoded !== 'object' || decoded === null || typeof decoded.exp !== 'number') {
    throw new Error('Unable to determine access token expiry.');
  }

  return new Date(decoded.exp * 1000).toISOString();
};

export const createRefreshToken = (): string =>
  crypto.randomBytes(config.refreshTokenBytes).toString('base64url');

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const getRefreshTokenExpiresAt = (): Date =>
  new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
