import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

dotenv.config({
  path: new URL('../.env.test', import.meta.url),
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testDatabaseUrl) {
  console.error('TEST_DATABASE_URL is required for API tests.');
  console.error(
    'Create a disposable PostgreSQL database and set TEST_DATABASE_URL before running.',
  );
  process.exit(1);
}

const env = {
  ...process.env,
  AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX ?? '10000',
  AUTH_SESSION_RATE_LIMIT_MAX: process.env.AUTH_SESSION_RATE_LIMIT_MAX ?? '10000',
  BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS ?? '4',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173',
  DATABASE_URL: testDatabaseUrl,
  DIRECT_URL: testDatabaseUrl,
  GENERATION_RATE_LIMIT_MAX: process.env.GENERATION_RATE_LIMIT_MAX ?? '10000',
  GUMROAD_PRODUCT_ID: process.env.GUMROAD_PRODUCT_ID ?? 'test-product',
  JWT_SECRET:
    process.env.JWT_SECRET ?? 'test-secret-used-only-for-local-api-test-runs-change-in-production',
  MODEL_PROVIDER_API_KEY: process.env.MODEL_PROVIDER_API_KEY ?? 'test-model-provider-key',
  NODE_ENV: 'test',
  REFRESH_TOKEN_BYTES: process.env.REFRESH_TOKEN_BYTES ?? '32',
};

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('pnpm', ['exec', 'prisma', 'migrate', 'deploy']);
run('pnpm', ['exec', 'vitest', 'run', ...process.argv.slice(2)]);
