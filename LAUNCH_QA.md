# GhostCTO Launch QA

Use this checklist before each production launch or release candidate. Run it against a disposable founder account first, then repeat the payment and ownership checks with the production configuration before launch.

## Environment

- Web app URL:
- API URL:
- Database:
- Model provider key configured:
- Google OAuth configured:
- Gumroad product and webhook configured:
- Test founder email:
- Test admin email:
- Test project name:
- Browser and device set:

## Core Checklist

| Status | Area | Test | Steps | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | Auth | Register | Create a new founder account with email, name, and password. | Account is created, user lands in the authenticated workspace, and no existing user data appears. |
| [ ] | Auth | Login | Log out, then log in with the registered email and password. | Login succeeds, session persists after refresh, and workspace loads the same founder data. |
| [ ] | Auth | Google login | Sign in with Google using an allowed test account. | OAuth redirects back to the app, creates or links the account correctly, and shows the authenticated workspace. |
| [ ] | Project | Create project | Start a new project and complete all required onboarding fields with realistic founder context. | Project is created as active, context appears on the project page, and saved answers match submitted values. |
| [ ] | Generation | Generate roadmap | From the project page, generate the Roadmap module. | A roadmap document is created, appears in Recent documents and Documents, and opens with saved content. |
| [ ] | Generation | Generate stack advice | Open Stack Advisor, adjust constraints, and generate advice. | Recommendation, layer decisions, risks, assumptions, and full markdown render; document is saved to history. |
| [ ] | Generation | Generate spec | Open Technical Spec Writer, submit a complete feature request, and generate a spec. | Structured spec tabs render, markdown export/copy controls work, and document history stores the generated spec. |
| [ ] | Generation | Create JD | From the project page, create the Developer JD module. | Developer JD document is created, visible in Recent documents and Documents, and available for PDF export. |
| [ ] | Generation | Analyze quote | Open Rate Validator, paste a realistic proposal, and validate it. | Verdict, risks, missing scope, questions, and negotiation language render and save to document history. |
| [ ] | Generation | Audit snippet | Open Code Audit, choose pasted code, submit a representative code snippet. | Audit summary, findings, questions, and recommended actions render; snippet source is saved in metadata only as intended. |
| [ ] | Generation | Audit public repo | Open Code Audit, choose repository URL, submit a public GitHub repo URL. | Repository is fetched, audit renders, and inaccessible/private repos produce a clear error. |
| [ ] | Generation | Vet developer | Open Agency and Developer Vetting, paste portfolio, proposal, and concern. | Scorecard, red flags, proof requests, questions, and next steps render and save to history. |
| [ ] | Chat | Chat in project context | Open project chat and ask a question that references the project roadmap or saved documents. | Response uses project context, stores the founder and advisor messages, and history survives refresh. |
| [ ] | Export | Export PDF | Export a roadmap, stack advice, technical spec, or Developer JD as PDF. | PDF downloads with a readable filename, correct title, preserved content, and no server error. |
| [ ] | Payment | Verify payment | Complete the Gumroad purchase or verified test purchase flow, then return to the app. | Plan upgrades to lifetime access after webhook or verification, billing page reflects paid status, and generation limits update. |
| [ ] | Payment | Locked unpaid state | Use a free account that has reached its generation allowance. | Paid-only generation is blocked, locked module states are visible, and billing calls to action do not expose paid features before upgrade. |
| [ ] | Auth | Logout | Log out from the authenticated app. | Session cookies/tokens are cleared, protected routes redirect to login, and browser back does not reveal private data. |
| [ ] | Responsive | Mobile layout | Run the full project flow on a mobile viewport, including onboarding, project page, generation forms, documents, billing, and chat. | Layouts remain usable without horizontal overflow, clipped buttons, overlapping text, or hidden primary actions. |
| [ ] | Reliability | Error states | Force invalid form input, model-provider failure, unreachable public repo, expired session, and rate limit responses. | User sees clear recovery language, no raw stack traces appear, and retry/navigation paths are obvious. |
| [ ] | Security | Data ownership | With two founder accounts, try to access another account's project, document, chat history, PDF export, and generation endpoints by URL/API. | All cross-account reads and writes return unauthorized or not found; no document metadata or project context leaks. |

## Admin Checklist

| Status | Area | Test | Steps | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | Admin | Stats | Log in as an admin and open Support tools. | System counts load without exposing sensitive private fields. |
| [ ] | Admin | User lookup | Search for a founder by exact email. | Only safe account fields and aggregate counts are shown. |
| [ ] | Admin | Non-admin access | Open `/admin` as a founder. | Access is blocked and the user is redirected or shown a clear forbidden state. |

## Small Fixes From This QA Pass

- Roadmap and Developer JD generation are now reachable from the project page, using the existing backend generation routes.
- Newly generated roadmap and Developer JD documents are added to Recent documents immediately, so they can be opened or exported without a page refresh.

## Known Limitations For V1

- Private repository audits are not supported; the code audit flow only handles public GitHub repositories or pasted code.
- Generated outputs are advisory planning artifacts, not legal, security, financial, hiring, or compliance guarantees.
- Payment access depends on Gumroad webhook or verification completing successfully; manual support may be needed if a webhook is delayed.
- Google login requires production OAuth credentials and authorized redirect URLs; email/password remains the fallback auth path.
- The first version prioritizes structured project context and saved documents over automated model training or background learning.
- Document generation can fail or time out when the model provider is unavailable; users must retry after the provider recovers.
- PDF export is supported for roadmap, stack advice, technical spec, and Developer JD documents, not every saved artifact type.
- Chat uses saved project context and selected document excerpts, but it does not replace reviewing the full saved document history.
- Mobile layouts are responsive, but long pasted proposals, code snippets, and audit evidence still require careful scroll testing on small screens.
- Admin tools are intentionally narrow for V1 and do not include full customer support impersonation or account mutation controls.
