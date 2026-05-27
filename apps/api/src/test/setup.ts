import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

import { afterAll, afterEach, beforeEach, vi } from 'vitest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for API tests.');
}

process.env.AUTH_RATE_LIMIT_MAX ??= '10000';
process.env.AUTH_SESSION_RATE_LIMIT_MAX ??= '10000';
process.env.BCRYPT_ROUNDS ??= '4';
process.env.CLIENT_ORIGIN ??= 'http://localhost:5173,http://127.0.0.1:5173';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = testDatabaseUrl;
process.env.GENERATION_RATE_LIMIT_MAX ??= '10000';
process.env.GUMROAD_PRODUCT_ID ??= 'test-product';
process.env.JWT_SECRET ??= crypto.randomUUID();
process.env.NODE_ENV = 'test';
process.env.REFRESH_TOKEN_BYTES ??= '32';

const getPrisma = async () => {
  const { prisma } = await import('../infrastructure/database/prisma.js');

  return prisma;
};

const resetDatabase = async () => {
  // Safeguard: Prevent wiping the development database by checking it against development .env config
  const devEnvPath = path.resolve(process.cwd(), '.env');
  let devDatabaseUrl = '';
  if (fs.existsSync(devEnvPath)) {
    try {
      const devEnv = dotenv.parse(fs.readFileSync(devEnvPath));
      devDatabaseUrl = devEnv.DATABASE_URL?.trim() || '';
    } catch {
      // Ignore unreadable local env files; the safety check still runs when parsing succeeds.
    }
  }

  const currentDatabaseUrl = process.env.DATABASE_URL?.trim();

  if (devDatabaseUrl && currentDatabaseUrl === devDatabaseUrl) {
    throw new Error(
      `CRITICAL SAFETY STOP: Database wipe aborted! The test runner is configured to use your DEVELOPMENT database (${currentDatabaseUrl}). Please check your environment variables or config.`,
    );
  }

  const prisma = await getPrisma();

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Payment",
      "RefreshToken",
      "VettingReport",
      "QuoteAnalysis",
      "AuditReport",
      "ChatMessage",
      "GeneratedDocumentFeedback",
      "GeneratedDocument",
      "ProjectAnswer",
      "Project",
      "User"
    RESTART IDENTITY CASCADE
  `);
};

beforeEach(async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('Unexpected external network request in API test.');
    }),
  );

  await resetDatabase();
});

afterEach(async () => {
  const { setModelProviderForTesting } = await import('../services/model-provider/index.js');

  setModelProviderForTesting(null);
  vi.unstubAllGlobals();
});

afterAll(async () => {
  const prisma = await getPrisma();

  await prisma.$disconnect();
});
