# AGENT.md — TX RetailOS Client

## Purpose
This repository contains the TX RetailOS web application, built with Next.js, React, TypeScript, Tailwind CSS, and PostgreSQL-backed application routes. Follow the existing architecture in this repository; do not assume the separate Flask API is the runtime backend for every screen.

## Before changing code
1. Read this file and the relevant sections of `README.md`.
2. Inspect the existing page/component, API route, shared types, and related code before editing.
3. Keep changes focused on the requested task. Avoid unrelated refactors, new dependencies, or architectural changes without a clear need.
4. Never commit secrets, credentials, production data, or `.env.local`.

## Application and API rules
- Use TypeScript types that reflect the actual API/database contract. Update shared types when that contract intentionally changes.
- Validate inputs on the server as well as in the UI. Client-side validation improves usability but is not a security boundary.
- Enforce authentication and role-based authorization on protected server routes; hiding a button is not authorization.
- Keep database writes and related stock, purchase, sale, and audit changes transactional where required. Prevent partial updates that leave inventory or financial records inconsistent.
- Treat prices, totals, stock quantities, roles, and user IDs from the browser as untrusted. Recalculate or validate sensitive values server-side.
- Handle loading, empty, success, validation-error, authentication-expiry, and server-error states. Do not leave users on a blank screen after a failed request.
- Prevent accidental duplicate submissions for sales, purchases, and other state-changing actions. Preserve request/idempotency behavior where supported.
- Keep UI behavior consistent with the existing role permissions: ADMIN, MANAGER, and EMPLOYEE.
- Use accessible labels, keyboard-operable controls, and clear feedback. Keep styling consistent with the existing Tailwind/CSS patterns.

## Security and configuration
- Keep secrets in environment variables; never expose server-only secrets through client-side code or public environment variables.
- Do not weaken session, cookie, password, setup-key, or role checks to make a feature easier to implement.
- Never commit `.env.local` or production credentials. Use `.env.example` for documented variable names only.

## Testing and verification
Run commands from the repository root:
- Install dependencies: `npm install`
- Lint: `npm run lint`
- Production build: `npm run build`
- Start locally when needed: `npm run dev`
- Add or update tests for meaningful behavior changes when a suitable test setup exists. Do not introduce a test framework without explaining why it is needed.
- For changes to database schema or server routes, verify both success and failure cases, authorization boundaries, and transaction behavior where relevant.
- Do not claim a command passed unless you actually ran it. Report commands that could not be run and why.

## Completion checklist
- [ ] Existing implementation and API/database contract were inspected.
- [ ] Loading, error, success, and permission states were considered.
- [ ] Relevant tests or checks were run, with results reported.
- [ ] No secrets or unrelated changes were included.
- [ ] The final summary explains what changed, files affected, checks run, and any remaining risks.
