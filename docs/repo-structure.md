# Repository Structure

GhostCTO uses a simple monorepo layout:

- `apps/api` contains the Express API, Prisma schema, and database seed.
- `apps/web` contains the React UI, layout shell, pages, and shared UI primitives.
- `docs` contains repo-level conventions and architecture notes.

## API Conventions

- `src/core` owns bootstrap code such as config, app creation, and server startup.
- `src/infrastructure` owns external integrations such as the database client.
- `src/modules` owns product features and domain-specific handlers.
- `src/middleware` owns reusable HTTP middleware.
- `src/lib` owns small shared helpers.
- `prisma` owns schema, migration files, and seed scripts.

## Web Conventions

- `src/layouts` owns page scaffolding and navigation shells.
- `src/features` owns feature-level screens and workflows.
- `src/components` owns reusable UI primitives.
- `src/lib` owns small client-side helpers.

## Placement Rule

New code should go to the narrowest folder that matches its responsibility. Feature code belongs in `modules` or `features`, infrastructure belongs in `infrastructure`, and shared primitives stay in `lib` or `components`.
