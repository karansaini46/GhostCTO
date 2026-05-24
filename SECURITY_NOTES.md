# GhostCTO Security Notes

## V1 Assumptions

- API traffic is served over HTTPS in production, behind a trusted proxy.
- `CLIENT_ORIGIN` is set per environment to the exact browser origins allowed to call the API.
- `JWT_SECRET`, database credentials, OAuth credentials, billing credentials, and model provider keys are stored only in server-side environment variables.
- Founder access is scoped by authenticated `userId`; project, document, report, and chat reads or writes must include ownership filters.
- Admin routes are intended only for internal operators with the `ADMIN` role.

## Implemented Controls

- Helmet is enabled and `x-powered-by` is disabled.
- Browser CORS is restricted to `CLIENT_ORIGIN`; wildcard origins are rejected at startup.
- Auth routes and generation routes have rate limits.
- Project, billing, and admin routes require authentication; admin routes also require the admin role.
- Project and document access paths use `userId` ownership checks.
- Mutation bodies, route params, and relevant query params are validated with Zod.
- Password hashes are never selected for API responses, and refresh tokens are stored as hashes.
- External repository review is limited to public repository roots, selected text files, per-file byte limits, and total review byte limits.
- JSON request bodies are size-limited through `JSON_LIMIT`.
- Billing license keys are not returned to the client and are stored only as hashes plus a short suffix.

## V1 Limitations

- Refresh token rotation does not yet implement reuse detection across a token family.
- Cookie-backed refresh and logout rely on `SameSite`, secure cookies, and origin enforcement; there is no separate CSRF token.
- Admin tooling can view user account metadata needed for support, but does not expose password hashes or refresh token hashes.
- Generated documents may contain founder-provided business context; access control protects them, but users should not paste unrelated secrets.
- Repository review is advisory and limited to selected public files. It is not a full security audit or private repository scan.
- Rate limits are process-level middleware limits unless backed by shared infrastructure in deployment.
- Secrets are not rotated automatically by the application.
