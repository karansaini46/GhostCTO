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
process.env.JWT_SECRET ??= 'test-secret-used-only-for-local-api-test-runs-change-in-production';
process.env.MODEL_PROVIDER_API_KEY ??= 'test-model-provider-key';
process.env.MODEL_PROVIDER_MODEL ??= 'test-model';
process.env.NODE_ENV = 'test';
process.env.REFRESH_TOKEN_BYTES ??= '32';

const getPrisma = async () => {
  const { prisma } = await import('../infrastructure/database/prisma.js');

  return prisma;
};

const resetDatabase = async () => {
  const prisma = await getPrisma();

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Payment",
      "RefreshToken",
      "VettingReport",
      "QuoteAnalysis",
      "AuditReport",
      "ChatMessage",
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
