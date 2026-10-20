# TX RetailOS release-readiness report

Date: 2026-10-20

## Scope

This report records repository-level evidence for the client/server architecture, CI configuration, and known deployment risks. It does not claim a live production audit or a complete end-to-end test run.

## Verified from repository files

- The client README describes Next.js as a browser UI and the Flask repository as the source of truth for application data and business logic.
- The client uses a same-origin `/api/:path*` rewrite configured in `next.config.ts`; the upstream comes from server-only `RETAILOS_API_ORIGIN` with a production default.
- The client has one frontend workflow at `.github/workflows/frontend-ci.yml`, running `npm ci`, lint, tests, and production build. A second `ci.yml` workflow is not present on the inspected main branch.
- The server has `.github/workflows/tests.yml` and `pytest.ini`; the workflow provisions PostgreSQL, validates the Alembic migration graph, and runs backend tests.
- The server README explicitly warns that `memory://` rate-limit storage is not shared across workers/instances and recommends a shared Redis service for production.
- The server README says the current API uses session-cookie authentication and does not validate `Authorization` or `X-CSRF-Token` headers.
- Client engineering guidance was inconsistent with the README: it described PostgreSQL-backed Next.js routes and roles. `AGENT.md` has been updated to reflect the Flask-backed architecture.

## Migration review

The client has a legacy `db/migrations/` area mentioned in the earlier contract review. This pass has not established whether every file is unused by any deployment or external workflow. No migration files were deleted.

Before removing legacy migrations, search deployment history, branches, scripts, and documentation for references; confirm they are not applied to a live database; then remove them in a separate reviewed change if safe. The Flask server's Alembic migration history is separate and must be preserved. Never rewrite an already-applied migration.

## Deployment and security risks still requiring evidence

1. **Production health:** no authenticated end-to-end smoke test or production health-check result is recorded in this change.
2. **Proxy trust and rate limiting:** inspect the deployed Flask `ProxyFix` configuration and actual proxy chain. Confirm the client IP used for rate limits is correct. Verify a shared Redis rate-limit store is configured, reachable, and monitored in production; do not rely on `memory://` across multiple workers.
3. **Session cookie and CORS:** verify HTTPS, cookie `Secure`/ `SameSite` attributes, the exact frontend origin, and credential behavior through the same-origin proxy in the deployed environment.
4. **Upstream URL:** verify `RETAILOS_API_ORIGIN` is set to the intended Flask deployment and that the deployed API is healthy.
5. **CI evidence:** capture the current client and server GitHub Actions results for the release commit. Repository workflow definitions are not proof that both checks passed on the same release candidate.
6. **Cross-repository integration:** client source-contract checks do not substitute for browser-driven checkout, stock-deduction, retry/idempotency, receipts, customer-balance, alert, and dashboard checks against a running Flask service and test database.

## Required release gates

- [ ] Client CI passes on the release commit: `npm ci`, `npm test`, `npm run lint`, `npm run build`.
- [ ] Server CI passes on the release commit, including migration checks and the PostgreSQL-backed test suite.
- [ ] Migration graph has exactly one head and both fresh-database setup and supported upgrade paths pass in CI.
- [ ] Production `RETAILOS_API_ORIGIN`, cookie/CORS behavior, trusted-proxy chain, and shared rate-limit storage are verified.
- [ ] Login, refresh/session persistence, logout, protected-route expiry, checkout, duplicate-sale retry, insufficient-stock rejection, receipt, customer balance, alerts, and dashboard totals pass a documented smoke test.
- [ ] Legacy client migrations have a documented keep/remove decision based on reference and deployment evidence.
- [ ] All remaining failures are linked to tracked issues. Any authorization, stock integrity, duplicate-sale, or financial-record inconsistency blocks release.

## Current assessment

**Status: Not yet release-ready based on evidence recorded here.** Architecture documentation and client CI configuration are aligned, but production configuration, the server's actual CI result for the release commit, legacy migration disposition, and live integrated behavior remain unverified. Do not treat the absence of a known failure as proof that a critical risk is resolved.
