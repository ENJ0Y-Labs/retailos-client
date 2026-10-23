import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");

test("transactions use the supported store-scoped sales contract", () => {
  const page = source("app/transactions/page.tsx");
  assert.match(page, /new URLSearchParams\(\{ store_id: String\(storeId\) \}\)/);
  assert.match(page, /params\.set\("payment_method", paymentMethod\)/);
  assert.match(page, /api<SalesListResponse>/);
  assert.match(page, /sale\.total_amount/);
  assert.match(page, /sale\.payment_method/);
  assert.match(page, /sale\.client_transaction_id/);
  assert.doesNotMatch(page, /method:\s*["']PATCH["']/);
  assert.doesNotMatch(page, /status=|params\.set\(["']search["']/);
});

test("transactions combine filters, show active criteria and refresh matching totals", () => {
  const page = source("app/transactions/page.tsx");
  assert.match(page, /type="date" value=\{startDate\}/);
  assert.match(page, /type="date" value=\{endDate\}/);
  assert.match(page, /params\.set\("start_date", startDate\)/);
  assert.match(page, /params\.set\("end_date", endDate\)/);
  assert.match(page, /params\.set\("category_id", categoryId\)/);
  assert.match(page, /params\.set\("payment_method", paymentMethod\)/);
  assert.match(page, /Start date must be on or before end date/);
  assert.match(page, /Active filters:/);
  assert.match(page, /Clear Filters/);
  assert.match(page, /filteredTotals\.sales/);
  assert.match(page, /filteredTotals\.paid/);
  assert.match(page, /filteredTotals\.balance/);
  assert.match(page, /const paginatedRows = visibleRows\.slice/);
  assert.doesNotMatch(page, /params\.set\("page", String\(page\)\)/);
});

test("transaction details use the supported sale lookup route and store ID", () => {
  const page = source("app/transactions/page.tsx");
  assert.match(page, /\/sales\/get\?/);
  assert.match(page, /id: String\(id\), store_id: String\(storeId\)/);
  assert.match(page, /api<\{ receipt: Receipt \}>/);
});

test("checkout connects customer creation, sale balances, and updated receipt display", () => {
  const page = source("app/sales/page.tsx");
  const types = source("lib/types.ts");
  assert.match(page, /setCustomerId\(String\(data\.customer\.id\)\)/);
  assert.match(page, /customer_id: customerId \? Number\(customerId\) : null/);
  assert.match(page, /client_transaction_id: saleTransactionId/);
  assert.match(page, /payment_method: paymentMethod === "CASH"/);
  assert.match(page, /amount_paid: amountPaid/);
  assert.match(page, /setReceipt\(data\.receipt\)/);
  assert.match(page, /label="Amount paid" value=\{money\(Number\(receipt\.amount_paid\)\)\}/);
  assert.match(page, /label="Outstanding balance" value=\{money\(Number\(receipt\.balance\)\)\}/);
  assert.match(page, /sale\.amount_paid/);
  assert.match(page, /sale\.balance/);
  assert.match(page, /window\.print\(\)/);
  assert.match(types, /export type SaleSummary = \{[\s\S]*?amount_paid: string;[\s\S]*?balance: string;/);
});

test("sales receipt renders detailed item and payment breakdown instead of raw server text", () => {
  const page = source("app/sales/page.tsx");
  assert.match(page, /receipt-document/);
  assert.match(page, /Items purchased/);
  assert.match(page, /Unit price/);
  assert.match(page, /Subtotal/);
  assert.match(page, /receipt\.items\.map/);
  assert.match(page, /products\.find\(\(product\) => product\.id === item\.product_id\)/);
  assert.match(page, /Payment method/);
  assert.match(page, /Outstanding balance/);
  assert.match(page, /Thank you for your purchase/);
  assert.doesNotMatch(page, /<pre className="mt-4[\s\S]*?receipt\.printable_text/);
});

test("debts page records payments through the supported store-scoped payment contract", () => {
  const page = source("app/debts/page.tsx");
  assert.match(page, /\/customers\/owes\?store_id=/);
  assert.match(page, /\/sales\?store_id=/);
  assert.match(page, /\/sales\/payments/);
  assert.match(page, /client_transaction_id:\s*request\.clientTransactionId/);
  assert.match(page, /payment_method:\s*request\.paymentMethod/);
  assert.match(page, /\/sales\/receipt/);
  assert.match(page, /sale\.total_amount/);
  assert.match(page, /sale\.amount_paid/);
  assert.match(page, /sale\.balance/);
  assert.match(page, /amount > remaining/);
  assert.match(page, /paymentHistory\.payments\.map/);
  assert.match(page, /Retry payment/);
  assert.doesNotMatch(page, /\/api\/debts/);
});

test("payment refresh failures do not leave an accepted payment retryable or masquerade as empty history", () => {
  const page = source("app/debts/page.tsx");
  assert.match(page, /setPendingPayment\(null\);[\s\S]*?Refreshing the balance and receipt/);
  assert.match(page, /Payment was accepted by the server, but payment history refresh failed/);
  assert.match(page, /Payment history could not be verified:/);
  assert.match(page, /historyError \? \(/);
  assert.match(page, /Retry only with the same transaction ID/);
});

test("debt payment history bypasses cached reads and explains a missing backend route", () => {
  const page = source("app/debts/page.tsx");
  assert.match(page, /api<PaymentHistory>\(\`\/sales\/payments\?\$\{params\.toString\(\)\}\`, \{ refresh: true \}\)/);
  assert.match(page, /does not expose the payment-history endpoint/);
  assert.match(page, /const newlyCollected = Math\.max\(0, Number\(historyData!\.amount_paid\) - Number\(selectedSale\.amount_paid\)\)/);
  assert.match(page, /max=\{paymentHistory\?\.balance \?\? selectedSale\.balance\}/);
});

test("settings page does not call unsupported store mutation routes", () => {
  const page = source("app/settings/page.tsx");
  assert.match(page, /user\?\.store_name/);
  assert.match(page, /editing has been disabled/i);
  assert.doesNotMatch(page, /\/api\/store/);
  assert.doesNotMatch(page, /fetch\(/);
});

test("shared API helper unwraps success data and surfaces structured errors", () => {
  const helper = source("lib/api.ts");
  assert.match(helper, /credentials:\s*["\x27]same-origin["\x27]/);
  assert.match(helper, /body\?\.data\s*\?\?\s*body/);
  assert.match(helper, /body\?\.error\?\.message/);
  assert.match(helper, /body\?\.error\?\.code/);
});

test("Next.js uses a configurable same-origin API proxy", () => {
  const config = source("next.config.ts");
  assert.match(config, /RETAILOS_API_ORIGIN/);
  assert.match(config, /source:.*api/);
});

test("protected API 401s send the user to an expired-session login", () => {
  const helper = source("lib/api.ts");
  assert.match(helper, /window.location.assign/);
  assert.match(helper, /session-expired/);
  const login = source("app/login/page.tsx");
  assert.match(login, /Your session expired/);
});

test("navigation contains only implemented routes and does not filter by unsupported roles", () => {
  const shell = source("components/layout/DashboardShell.tsx");
  for (const route of ["/dashboard", "/sales", "/inventory", "/transactions", "/customers", "/debts", "/settings"]) {
    assert.ok(shell.includes(`href: "${route}"`), `missing navigation route ${route}`);
  }
  for (const route of ["/purchases", "/report", "/users", "/notification"]) {
    assert.ok(!shell.includes(route), `unsupported navigation route remains: ${route}`);
  }
  assert.doesNotMatch(shell, /ADMIN_ROLES|MANAGEMENT_ROLES|ALL_ROLES|activeRole|item\.roles/);
  assert.doesNotMatch(shell, /href="\/notification"/);
});


test("inventory category tabs filter by saved category without mutating products", () => {
  const page = source("app/inventory/page.tsx");
  const types = source("lib/types.ts");
  assert.match(types, /export type Category = \{/);
  assert.match(types, /category_id\?: number \| null/);
  assert.match(page, /\/categories\?store_id=/);
  assert.match(page, /role="tablist"/);
  assert.match(page, /aria-selected=\{selectedCategoryId === "all"\}/);
  assert.match(page, /const filteredProducts = selectedCategoryId === "all"[\s\S]*?product\.category_id/);
  assert.match(page, /retailos:inventory:selected-category:/);
  assert.match(page, /filteredProducts\.map\(\(product\) =>/);
  assert.match(page, /Loading categories/);
  assert.match(page, /Categories could not be loaded/);
  assert.match(page, /No products or services are assigned to this category yet/);
  assert.doesNotMatch(page, /selectCategory[\s\S]{0,250}api\(/);
});

test("products and services listing supports category tabs and restores selection", () => {
  const page = source("app/items/page.tsx");
  assert.match(page, /\/categories\?store_id=/);
  assert.match(page, /role="tablist"/);
  assert.match(page, /aria-selected=\{selectedCategoryId === "all"\}/);
  assert.match(page, /selectedCategoryId === "all" \|\| String\(product\.category_id/);
  assert.match(page, /retailos:items:selected-category:/);
  assert.match(page, /Loading categories/);
  assert.match(page, /Categories could not be loaded/);
  assert.match(page, /No products or services are assigned to this category/);
  assert.match(page, /product\.product_type === "Service"/);
});


test("inventory product form supports predefined and custom units without losing legacy values", () => {
  const page = source("app/inventory/page.tsx");
  assert.match(page, /value: "piece", label: "Pieces"/);
  assert.match(page, /value: "kg", label: "kg"/);
  assert.match(page, /value: "bag", label: "Bags"/);
  assert.match(page, /<option value="other">Other<\/option>/);
  assert.match(page, /Custom unit/);
  assert.match(page, /customUnit\.trim\(\)/);
  assert.match(page, /setCustomUnit\(standardUnits\.some\(\(unit\) => unit\.value === product\.base_unit\) \? "" : product\.base_unit\)/);
  assert.match(page, /base_unit: isService \? "piece" : \(usesCustomUnit \? customUnit\.trim\(\) : form\.baseUnit\.trim\(\)\)/);
  assert.match(page, /Unit: \$\{displayUnit\(product\.base_unit\)\}/);
  assert.match(page, /unit not recorded/);
  assert.match(page, /Conversion unavailable/);
});


test("transactions page supports filtered PDF and CSV exports with duplicate-action protection", () => {
  const page = source("app/transactions/page.tsx");
  assert.match(page, /params\.set\("start_date", startDate\)/);
  assert.match(page, /params\.set\("end_date", endDate\)/);
  assert.match(page, /params\.set\("category_id", categoryId\)/);
  assert.match(page, /params\.set\("payment_method", paymentMethod\)/);
  assert.match(page, /Export PDF/);
  assert.match(page, /Export CSV/);
  assert.match(page, /exporting !== null/);
  assert.match(page, /while \(true\)/);
  assert.match(page, /retailos-transactions-/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /text\/csv/);
  assert.match(page, /Export failed:/);
});

test("transaction refund workflow uses the authoritative server contract and receipt", () => {
  const page = source("app/transactions/page.tsx");
  assert.match(page, /\/sales\/refunds/);
  assert.match(page, /method: "POST"/);
  assert.match(page, /client_transaction_id: refundRequestRef\.current/);
  assert.match(page, /amount: amount\.toFixed\(2\)/);
  assert.match(page, /reason: refundReason\.trim\(\)/);
  assert.match(page, /payment_method: refundPaymentMethod/);
  assert.match(page, /window\.confirm\(/);
  assert.match(page, /disabled=\{refundSubmitting/);
  assert.match(page, /REFUND_EXCEEDS_REMAINING_AMOUNT|remaining refundable amount/);
  assert.match(page, /data\.refund\.receipt/);
  assert.match(page, /refundReceipt\.refund_reference/);
  assert.match(page, /refundReceipt\.original_sale_id/);
  assert.match(page, /refundReceipt\.amount/);
  assert.match(page, /refundReceipt\.created_at/);
  assert.match(page, /refundReceipt\.payment_method/);
  assert.match(page, /printRefundReceipt/);
  assert.match(page, /await load\(\); await showDetails\(selectedSale\.id\)/);
});
