# AGENT.md — TX RetailOS Client

## Purpose and architecture
This repository contains the TX RetailOS browser client built with Next.js, React, TypeScript, and Tailwind CSS. The Flask API in `ENJ0Y-Labs/retailos-server` is the source of truth for authentication, persistence, store authorization, inventory, sales, customers, alerts, and dashboard data. The client does not own a PostgreSQL-backed application API.

Browser requests use the same-origin `/api/*` rewrite in `next.config.ts`, which forwards to the Flask API configured by the server-only `RETAILOS_API_ORIGIN` environment variable. Do not reintroduce direct cross-origin browser API calls without explicitly reviewing session-cookie, CORS, and deployment implications.

## Before changing code
1. Read this file and relevant sections of `README.md`.
2. Inspect the existing page/component, shared API helper, types, tests, and corresponding Flask route/schema before editing.
3. Keep changes focused. Avoid new dependencies and architectural changes without a clear reason.
4. Never commit secrets, production data, or `.env.local`.

## Application and API rules
- Treat the Flask API contract as authoritative. Match route names, query parameters, snake_case fields, response envelopes, and structured errors.
- Use the shared `lib/api.ts` helper for API requests where appropriate; include required store scope and preserve same-origin credentials behavior.
- Client-side validation improves usability but is not a security boundary. Authorization and data validation belong on the Flask server.
- Do not invent unsupported endpoints, role fields, or business capabilities. Navigation visibility is not authorization.
- Handle loading, empty, success, validation, authentication-expiry, network, and server-error states.
- Prevent duplicate submissions for state-changing operations and preserve idempotency identifiers across retries when supported by the server.
- Use accessible labels, keyboard-operable controls, and clear feedback. Follow existing styling patterns.

## Security and configuration
- Keep server-only secrets in deployment environment settings; never expose them through `NEXT_PUBLIC_*` variables.
- Do not weaken session, cookie, password, or authorization checks to make a feature easier to implement.
- The `/api` rewrite is a same-origin proxy, not proof that production is correctly configured. Verify the deployed upstream URL and Flask proxy/cookie/rate-limit settings before release.

## Testing and verification
Run commands from the repository root:
- Install dependencies reproducibly: `npm ci`
- Tests: `npm test`
- Lint: `npm run lint`
- Production build: `npm run build`
- Local development: `npm run dev`

Add regression tests for meaningful behavior changes. Source-contract tests are not browser-driven end-to-end tests. For changes involving the Flask API, verify success and failure cases, store authorization, transaction behavior, and idempotency in the server test suite as well. Never claim a command passed unless it was actually run.

## Completion checklist
- [ ] Existing client and server contracts were inspected.
- [ ] Loading, error, success, and authentication-expiry states were considered.
- [ ] Relevant client and server checks were run, with results reported.
- [ ] No secrets or unrelated changes were included.
- [ ] Remaining risks and any unverified production assumptions are documented.
