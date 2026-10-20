import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");

test("authentication refreshes the server session and handles protected-request expiry", () => {
  const auth = source("components/auth/AuthProvider.tsx");
  const api = source("lib/api.ts");
  assert.match(auth, /api<\\{ user: User \\}>\\("\\/auth\\/me"\\)/);
  assert.match(auth, /api\\("\\/auth\\/logout", \\{ method: "POST" \\}\\)/);
  assert.match(auth, /error\\.status === 401/);
  assert.match(auth, /Unable to verify your session/);
  assert.match(api, /credentials:\\s*["']same-origin["']/);
  assert.match(api, /response\\.status === 401/);
  assert.match(api, /session-expired/);
});

test("product management and stock adjustments use supported inventory endpoints", () => {
  const inventory = source("app/inventory/page.tsx");
  assert.match(inventory, /api<\\{ products: Product\\[\\] \\}>\\("\\/product\\/list\\?store_id=/);
  assert.match(inventory, /"\\/product\\/create"/);
  assert.match(inventory, /"\\/product\\/update"/);
  assert.match(inventory, /"\\/product\\/adjust"/);
  assert.match(inventory, /quantity_change: change/);
  assert.match(inventory, /"\\/product\\/movements\\?store_id=/);
  assert.match(inventory, /actionLock\\.current/);
});

test("checkout validates cart/payment, prevents concurrent submits, and preserves idempotency on retry", () => {
  const sales = source("app/sales/page.tsx");
  assert.match(sales, /if \\(checkoutLock\\.current \\|\\| submitting\\) return/);
  assert.match(sales, /Add at least one item before completing the sale/);
  assert.match(sales, /amountPaid > total/);
  assert.match(sales, /balance > 0 && !customerId/);
  assert.match(sales, /client_transaction_id: saleTransactionId/);
  assert.match(sales, /localStorage\\.setItem\\(\\s*"retailos-pending-sale-id"/);
  assert.match(sales, /product_id: item\\.product\\.id/);
  assert.match(sales, /unit_id: item\\.unitId/);
  assert.match(sales, /quantity: item\\.quantity/);
  assert.match(sales, /await load\\(\\)/);
});

test("receipt lookup and receipt generation use server-backed sale routes", () => {
  const sales = source("app/sales/page.tsx");
  assert.match(sales, /\\/sales\\/get\\?id=/);
  assert.match(sales, /"\\/sales\\/receipt"/);
  assert.match(sales, /json: \\{ id, store_id: storeId \\}/);
  assert.match(sales, /setReceipt\\(data\\.receipt\\)/);
});

test("customer balances and purchase history are read from customer endpoints", () => {
  const debts = source("app/debts/page.tsx");
  const customers = source("app/customers/page.tsx");
  const sales = source("app/sales/page.tsx");
  assert.match(debts, /\\/customers\\/owes\\?store_id=/);
  assert.match(debts, /outstanding_balance/);
  assert.match(customers, /"\\/customers\\?store_id="/);
  assert.match(customers, /\\/customers\\/history\\?id=/);
  assert.match(sales, /customer_id: customerId \\? Number\\(customerId\\) : null/);
  assert.match(sales, /Select a customer before recording an unpaid balance/);
});

test("alerts are loaded, generated, resolved, and deleted through supported endpoints", () => {
  const alerts = source("app/alerts/page.tsx");
  assert.match(alerts, /"\\/alerts\\?store_id="/);
  assert.match(alerts, /"\\/alerts\\/generate-low-stock\\?store_id="/);
  assert.match(alerts, /"\\/alerts\\/resolve\\?store_id="/);
  assert.match(alerts, /"\\/alerts\\/delete\\?store_id="/);
  assert.match(alerts, /setAlerts\\(data\\.alerts\\)/);
});

test("dashboard totals, daily brief, and recent sales share the authenticated store scope", () => {
  const dashboard = source("components/dashboard/LiveDashboard.tsx");
  assert.match(dashboard, /"\\/dashboard" \\+ query/);
  assert.match(dashboard, /"\\/dashboard\\/daily-brief" \\+ query/);
  assert.match(dashboard, /"\\/sales" \\+ query/);
  assert.match(dashboard, /store_id=/);
  assert.match(dashboard, /Africa\\/Lagos/);
  assert.match(dashboard, /Dashboard unavailable/);
  assert.match(dashboard, /onClick=\\{\\(\\) => \\{ setLoading\\(true\\)/);
});
