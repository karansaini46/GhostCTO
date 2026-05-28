# GhostCTO Cost Control

GhostCTO controls model and infrastructure spend through plan limits, request limits, and bounded inputs.

## Plan Limits

- Free users can keep one non-archived project.
- Free users can create up to `UNPAID_DAILY_GENERATION_LIMIT` paid-cost outputs per UTC day. The default is `3`.
- Lifetime users can create up to `LIFETIME_DAILY_GENERATION_LIMIT` paid-cost outputs per UTC day. The default is `100`.
- Daily usage counts generated documents plus advisor chat responses. The counter resets at the end of the UTC day.

## Request Limits

- Auth endpoints use `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX`.
- Session endpoints use `AUTH_SESSION_RATE_LIMIT_WINDOW_MS` / `AUTH_SESSION_RATE_LIMIT_MAX`.
- Generation and chat endpoints use `GENERATION_RATE_LIMIT_WINDOW_MS` / `GENERATION_RATE_LIMIT_MAX`.
- Generation rate limits are keyed by authenticated user ID when available, then by IP address.

## Input Bounds

- JSON request bodies are capped by `JSON_LIMIT`.
- Code audits accept either one public GitHub repository URL or one pasted code snippet, not both.
- Public repository review is limited to selected text files with per-file and total byte caps in the GitHub service.
- Generation schemas use Zod validation to reject malformed model output and retry structured output once before failing.

## Monitoring Signals

- Model token usage is emitted through structured API logs with `requestName`, `inputTokens`, `outputTokens`, and `totalTokens` when the provider returns usage metadata.
- Billing status reports project count, daily generation usage, and active plan to the frontend.

## Not Implemented

- There is no per-user currency budget ledger.
- There is no model-token preflight estimator before a generation request is sent.
- There is no queue-based generation throttling; requests execute synchronously behind route and daily usage limits.
