# GhostCTO

GhostCTO is a production SaaS workspace for founders building early-stage companies.

## Prerequisites

- Node.js 22 or newer
- pnpm 10 or newer

## Installation

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

## Local Development

```bash
pnpm dev
```

Run one app at a time:

```bash
pnpm dev:web
pnpm dev:api
```

Default local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:4000`

## Scripts

- `pnpm dev` starts both apps.
- `pnpm dev:web` starts the web app.
- `pnpm dev:api` starts the API server.
- `pnpm build` builds both apps.
- `pnpm lint` checks both apps.
- `pnpm format` formats the workspace.

## Environment Variables

Create local `.env` files from the committed examples before running the apps.

### Web

- `VITE_API_BASE_URL`: Base URL for browser requests to the API.
- `VITE_DEMO_MODE`: Set to `true` to enable the read-only demo project route with static sample data.

### API

- `PORT`: HTTP port for the API server.
- `NODE_ENV`: Runtime environment.
- `CLIENT_ORIGIN`: Allowed browser origin for local CORS.
- `DATABASE_URL`: PostgreSQL connection string.
- `DIRECT_URL`: Direct PostgreSQL connection string for migrations.
- `JWT_SECRET`: Secret used to sign access tokens.
- `JWT_ISSUER`: Issuer claim for access tokens.
- `JWT_AUDIENCE`: Audience claim for access tokens.
- `JWT_EXPIRES_IN`: Access token lifetime, for example `15m`.
- `AUTH_COOKIE_NAME`: Name of the refresh-token cookie.
- `AUTH_COOKIE_SAMESITE`: Refresh cookie same-site policy.
- `AUTH_RATE_LIMIT_WINDOW_MS`: Rate-limit window for login and register.
- `AUTH_RATE_LIMIT_MAX`: Request limit for login and register.
- `AUTH_SESSION_RATE_LIMIT_WINDOW_MS`: Rate-limit window for refresh, logout, and me.
- `AUTH_SESSION_RATE_LIMIT_MAX`: Request limit for refresh, logout, and me.
- `BCRYPT_ROUNDS`: Password hashing cost factor.
- `REFRESH_TOKEN_BYTES`: Raw refresh-token entropy size.
- `REFRESH_TOKEN_TTL_DAYS`: Refresh-token lifetime in days.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
- `PUPPETEER_EXECUTABLE_PATH`: Optional browser executable path.
- `GUMROAD_ACCESS_TOKEN`: Gumroad access token.
- `GUMROAD_WEBHOOK_SECRET`: Gumroad webhook signing secret.
- `MODEL_PROVIDER_API_KEY`: Provider key for model-backed workflows.

## Workspace Layout

```text
apps/
  api/
    src/
      core/
      infrastructure/
      modules/
      middleware/
      lib/
      routes/
    prisma/
  web/
    src/
      components/
      features/
      layouts/
      lib/
      styles.css
docs/
```
