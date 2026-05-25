# Deployment

This runbook deploys the API to Render, the web app to Vercel, and PostgreSQL to Supabase.

## Production Build Scripts

From the repository root:

```bash
pnpm install
pnpm build:production
```

Package-specific builds:

```bash
pnpm build:api
pnpm build:web
```

## 1. Prepare Supabase

1. Create a Supabase project.
2. Open the project database connection settings.
3. Set `DATABASE_URL` to the pooled runtime connection string.
4. Set `DIRECT_URL` to the non-pooled migration connection string.

Recommended Prisma connection split:

- `DATABASE_URL`: use the Supabase transaction pooler connection for API runtime traffic. This is the connection string with a pooler host and port `6543`.
- `DIRECT_URL`: use the direct database connection for Prisma migrations and schema tooling. This is the `db.<project-ref>.supabase.co:5432/postgres` connection when the deployment network can reach IPv6 or the project has the IPv4 add-on.
- If direct connections are unavailable from the deployment network, use the Supabase session pooler on port `5432` for `DIRECT_URL`. Do not use the transaction pooler for Prisma migrations.

The API Prisma config reads `DIRECT_URL` first for CLI commands and falls back to `DATABASE_URL`.

## 2. Deploy the API on Render

Create a new Render Web Service from this repository.

Render service settings:

- Root Directory: `apps/api`
- Runtime: Node
- Build Command: `pnpm install && npx prisma generate && pnpm build`
- Start Command: `npx prisma migrate deploy && node dist/server.js`
- Health Check Path: `/health`

Database migration command:

```bash
npx prisma migrate deploy
```

Required Render environment variables:

```env
NODE_ENV=production
CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app
DATABASE_URL=<supabase-pooled-transaction-url>
DIRECT_URL=<supabase-direct-or-session-url>
JWT_SECRET=<long-random-secret>
JWT_ISSUER=ghostcto-api
JWT_AUDIENCE=ghostcto-web
JWT_EXPIRES_IN=15m
AUTH_COOKIE_NAME=ghostcto_refresh_token
AUTH_COOKIE_SAMESITE=none
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
AUTH_SESSION_RATE_LIMIT_WINDOW_MS=900000
AUTH_SESSION_RATE_LIMIT_MAX=60
GENERATION_RATE_LIMIT_WINDOW_MS=60000
GENERATION_RATE_LIMIT_MAX=20
UNPAID_DAILY_GENERATION_LIMIT=3
LIFETIME_DAILY_GENERATION_LIMIT=100
BCRYPT_ROUNDS=12
REFRESH_TOKEN_BYTES=48
REFRESH_TOKEN_TTL_DAYS=30
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_CALLBACK_URL=https://<your-render-api>.onrender.com/auth/google/callback
GOOGLE_FRONTEND_REDIRECT_URL=https://<your-vercel-app>.vercel.app/login
GUMROAD_ACCESS_TOKEN=<gumroad-access-token>
GUMROAD_WEBHOOK_SECRET=<gumroad-webhook-secret>
GUMROAD_PRODUCT_ID=<gumroad-product-id>
MODEL_PROVIDER_API_KEY=<gemini-api-key>
MODEL_PROVIDER_MODEL=<gemini-model-name>
MODEL_PROVIDER_BASE_URL=https://generativelanguage.googleapis.com
JSON_LIMIT=1mb
```

Optional Render environment variables:

```env
PORT=<render-managed-port>
PUPPETEER_EXECUTABLE_PATH=<browser-executable-path-if-required>
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
```

Render sets `PORT` automatically. Set it manually only if the service needs a custom port.

After the first Render deploy finishes, verify the API:

```bash
curl https://<your-render-api>.onrender.com/health
```

The response should include `status`, `environment`, and `timestamp`.

## 3. Deploy the Web App on Vercel

Create a new Vercel project from this repository.

Vercel project settings:

- Root Directory: `apps/web`
- Build Command: `pnpm build`
- Output Directory: `dist`

Required Vercel environment variables:

```env
VITE_API_URL=https://<your-render-api>.onrender.com
VITE_UPGRADE_URL=<production-upgrade-or-checkout-url>
```

`VITE_API_URL` must point to the Render API origin. Do not include a path after the origin.

After Vercel provides the final production domain, update Render:

```env
CLIENT_ORIGIN=https://<your-vercel-production-domain>
GOOGLE_FRONTEND_REDIRECT_URL=https://<your-vercel-production-domain>/login
GOOGLE_CALLBACK_URL=https://<your-render-api>.onrender.com/auth/google/callback
```

Redeploy the Render API after changing these values.

## 4. Configure Google OAuth

In the Google OAuth client:

- Authorized JavaScript origin: `https://<your-vercel-production-domain>`
- Authorized redirect URI: `https://<your-render-api>.onrender.com/auth/google/callback`

The Render `GOOGLE_CALLBACK_URL` must exactly match the authorized redirect URI.

## 5. Final Verification

Run these checks after both services are live:

```bash
curl https://<your-render-api>.onrender.com/health
```

Open the Vercel URL in a browser and confirm that auth and project requests are sent to:

```text
https://<your-render-api>.onrender.com
```

If the browser reports CORS errors, confirm that Render `CLIENT_ORIGIN` is exactly the Vercel production origin, including `https://` and no trailing path.

## References

- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Prisma Supabase guide: https://www.prisma.io/docs/orm/overview/databases/supabase
