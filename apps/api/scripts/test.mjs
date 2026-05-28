import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

dotenv.config({
  path: new URL('../.env.test', import.meta.url),
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testDatabaseUrl) {
  process.stderr.write('TEST_DATABASE_URL is required for API tests.\n');
  process.stderr.write(
    'Create a disposable PostgreSQL database and set TEST_DATABASE_URL before running.\n',
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
  JWT_SECRET: process.env.JWT_SECRET ?? crypto.randomUUID(),
  MODEL_PROVIDER_API_KEY: process.env.MODEL_PROVIDER_API_KEY ?? '',
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
    process.stderr.write(`${result.error.message}\n`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('pnpm', ['exec', 'prisma', 'migrate', 'deploy']);
const testArgs = process.argv.slice(2);
const forwardedArgs = testArgs[0] === '--' ? testArgs.slice(1) : testArgs;

run('pnpm', ['exec', 'vitest', 'run', '--no-file-parallelism', ...forwardedArgs]);
