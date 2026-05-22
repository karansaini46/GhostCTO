import dotenv from 'dotenv';

dotenv.config();

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? 4000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  return port;
};

const parseOrigins = (value: string | undefined): string[] => {
  const origins = value ?? 'http://localhost:5173';

  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const config = {
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGIN),
  databaseUrl: process.env.DATABASE_URL?.trim(),
  isProduction: nodeEnv === 'production',
  jsonLimit: process.env.JSON_LIMIT ?? '1mb',
  nodeEnv,
  port: parsePort(process.env.PORT),
  serviceName: 'ghostcto-api',
};
