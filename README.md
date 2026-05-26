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
- `pnpm typecheck` type-checks both apps.
- `pnpm build:api` builds the API for production.
- `pnpm build:web` builds the web app for production.
- `pnpm build:production` builds both production apps explicitly.
- `pnpm lint` checks both apps.
- `pnpm format` formats the workspace.

Deployment instructions are in [DEPLOYMENT.md](DEPLOYMENT.md). Cost and usage controls are documented in [COST_CONTROL.md](COST_CONTROL.md).

## Environment Variables

Create local `.env` files from the committed examples before running the apps.

### Web

- `VITE_API_URL`: Base URL for browser requests to the API.

### API

- `PORT`: HTTP port for the API server.
- `NODE_ENV`: Runtime environment.
- `CLIENT_ORIGIN`: Allowed browser origin for local CORS.
- `JSON_LIMIT`: Maximum JSON request body size.
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
- `GENERATION_RATE_LIMIT_WINDOW_MS`: Rate-limit window for generation endpoints.
- `GENERATION_RATE_LIMIT_MAX`: Request limit for generation endpoints inside the rate-limit window.
- `UNPAID_DAILY_GENERATION_LIMIT`: Daily document and chat response limit for free users.
- `LIFETIME_DAILY_GENERATION_LIMIT`: Daily document and chat response limit for lifetime users.
- `BCRYPT_ROUNDS`: Password hashing cost factor.
- `REFRESH_TOKEN_BYTES`: Raw refresh-token entropy size.
- `REFRESH_TOKEN_TTL_DAYS`: Refresh-token lifetime in days.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
- `GOOGLE_CALLBACK_URL`: API callback URL configured in Google OAuth.
- `GOOGLE_FRONTEND_REDIRECT_URL`: Frontend login URL used after Google OAuth completes.
- `PUPPETEER_EXECUTABLE_PATH`: Optional browser executable path.
- `GUMROAD_PRODUCT_ID`: Gumroad product ID used for license verification.
- `MODEL_PROVIDER_API_KEY`: Google Gemini key for model-backed workflows.
- `MODEL_PROVIDER_MODEL`: Optional Gemini model override for all model-backed workflows.
- `MODEL_PROVIDER_BASE_URL`: Optional Gemini API base URL override.

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
