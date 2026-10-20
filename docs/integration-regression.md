# RetailOS integration regression checklist

This checklist separates automated regression checks from live, environment-dependent verification. Passing source-contract tests does not prove that the browser, deployed proxy, Flask API, and database work together end to end.

## Client checks

Run from the retailos-client repository root:

    npm ci
    npm test
    npm run lint
    npm run build

The Node test suite checks that client workflows keep using the supported API contracts for authentication/session expiry, product management and stock movements, checkout/idempotency, receipts, customer balances, alerts, and dashboard data.

## Server checks

Run from the retailos-server repository root, with the project's test dependencies available:

    python -m pytest server/tests

The Flask test suite is the source of truth for server-side session handling, store authorization, product validation, inventory adjustments, atomic stock deduction and rollback, duplicate-sale idempotency, receipts, customer balances/history, alerts, and dashboard calculations. Record the actual pytest summary in the PR before release; do not treat this document as evidence that the suite has already passed.

## Manual integrated smoke test

Use a disposable test store and non-production data. Keep the same browser session through the sequence.

1. **Authentication:** log in; refresh the page; confirm /auth/me preserves the session. Log out and confirm protected screens no longer load. Simulate a protected API 401 and verify the expired-session message. Simulate a network/5xx failure during session verification and verify the retry screen appears rather than silently logging out.
2. **Product and stock:** create a physical product with known opening stock (for example, 10 pieces); verify it appears in Inventory and Sales. Adjust stock by +1 and -1 and verify the displayed quantity and movement history.
3. **Checkout and duplicate protection:** sell 2 pieces. Verify the server receipt total, sale listing, and stock deduction (10 to 8, or the equivalent after adjustments). Retry the same request with the same client_transaction_id using the server test client or API tooling; verify no second sale or extra deduction is created. Attempt to sell more than available stock and verify the server rejects it without partial stock/sale changes.
4. **Receipts and customer balances:** look up and generate the receipt for the sale. Record a partially paid sale against a test customer and confirm the outstanding balance shown by Who Owes Me matches the server result. Confirm purchase history reflects the sale.
5. **Alerts and dashboard:** lower stock to or below the configured threshold, generate low-stock alerts, and verify they appear and can be resolved. Compare dashboard sales totals and recent sales with the sales list for the same Africa/Lagos business day.
6. **Failure behavior:** test a rejected validation request and a temporary API failure. Confirm the UI displays an error, prevents accidental repeated submission, and does not claim the operation succeeded.

## Evidence to attach to the PR

- [ ] Client npm test summary.
- [ ] Client lint result.
- [ ] Client production build result.
- [ ] Server pytest summary and pass/fail count.
- [ ] Manual smoke-test results, including any skipped steps and the reason.
- [ ] Any remaining failures linked to a tracked issue, with release blocked for data-integrity, authorization, duplicate-sale, or stock-deduction failures.

Do not paste session cookies, passwords, production customer data, or secrets into PR comments.
