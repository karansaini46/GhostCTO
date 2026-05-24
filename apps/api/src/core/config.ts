import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? 4000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  return port;
};

const normalizeOrigin = (origin: string): string => {
  if (origin === '*') {
    throw new Error('CLIENT_ORIGIN cannot include wildcard origins.');
  }

  let url: URL;

  try {
    url = new URL(origin);
  } catch {
    throw new Error('CLIENT_ORIGIN must contain valid HTTP or HTTPS origins.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('CLIENT_ORIGIN must contain only HTTP or HTTPS origins.');
  }

  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('CLIENT_ORIGIN entries must be origins, for example https://app.example.com.');
  }

  return url.origin;
};

const parseOrigins = (value: string | undefined): string[] => {
  if (!value?.trim()) {
    if (isProduction) {
      throw new Error('CLIENT_ORIGIN is required in production.');
    }

    return ['http://localhost:5173'];
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

  if (!origins.length) {
    throw new Error('CLIENT_ORIGIN must include at least one allowed origin.');
  }

  return [...new Set(origins)];
};

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsedValue = Number(value ?? fallback);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error('Expected a positive integer.');
  }

  return parsedValue;
};

const parseSameSite = (value: string | undefined): 'lax' | 'strict' | 'none' => {
  const normalized = (value ?? 'lax').toLowerCase();

  if (normalized === 'lax' || normalized === 'strict' || normalized === 'none') {
    return normalized;
  }

  throw new Error('AUTH_COOKIE_SAMESITE must be lax, strict, or none.');
};

export const config = {
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGIN),
  databaseUrl: process.env.DATABASE_URL?.trim(),
  accessTokenAudience: process.env.JWT_AUDIENCE?.trim() || 'ghostcto-web',
  accessTokenExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '15m',
  accessTokenIssuer: process.env.JWT_ISSUER?.trim() || 'ghostcto-api',
  accessTokenSecret: process.env.JWT_SECRET?.trim(),
  authCookieName: process.env.AUTH_COOKIE_NAME?.trim() || 'ghostcto_refresh_token',
  authCookieSameSite: parseSameSite(process.env.AUTH_COOKIE_SAMESITE),
  authCookieSecure: nodeEnv === 'production',
  authRateLimitMax: parsePositiveInteger(process.env.AUTH_RATE_LIMIT_MAX, 20),
  authRateLimitWindowMs: parsePositiveInteger(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  ),
  authSessionRateLimitMax: parsePositiveInteger(process.env.AUTH_SESSION_RATE_LIMIT_MAX, 60),
  authSessionRateLimitWindowMs: parsePositiveInteger(
    process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  ),
  bcryptRounds: parsePositiveInteger(process.env.BCRYPT_ROUNDS, 12),
  generationRateLimitMax: parsePositiveInteger(process.env.GENERATION_RATE_LIMIT_MAX, 20),
  generationRateLimitWindowMs: parsePositiveInteger(
    process.env.GENERATION_RATE_LIMIT_WINDOW_MS,
    60 * 1000,
  ),
  gumroadProductId: process.env.GUMROAD_PRODUCT_ID?.trim(),
  lifetimeDailyGenerationLimit: parsePositiveInteger(
    process.env.LIFETIME_DAILY_GENERATION_LIMIT,
    100,
  ),
  unpaidDailyGenerationLimit: parsePositiveInteger(process.env.UNPAID_DAILY_GENERATION_LIMIT, 3),
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL?.trim(),
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim(),
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
  googleFrontendRedirectUrl: process.env.GOOGLE_FRONTEND_REDIRECT_URL?.trim(),
  refreshTokenBytes: parsePositiveInteger(process.env.REFRESH_TOKEN_BYTES, 48),
  refreshTokenTtlDays: parsePositiveInteger(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  isProduction,
  jsonLimit: process.env.JSON_LIMIT ?? '1mb',
  modelProviderApiKey: process.env.MODEL_PROVIDER_API_KEY?.trim(),
  modelProviderBaseUrl:
    process.env.MODEL_PROVIDER_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com',
  modelProviderModel: process.env.MODEL_PROVIDER_MODEL?.trim(),
  nodeEnv,
  pdfBrowserExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined,
  port: parsePort(process.env.PORT),
  serviceName: 'ghostcto-api',
};
