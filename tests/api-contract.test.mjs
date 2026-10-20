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
  assert.match(page, /api<\{ sales: SaleRow\[\] \}>/);
  assert.match(page, /sale\.total_amount/);
  assert.match(page, /sale\.payment_method/);
  assert.match(page, /sale\.client_transaction_id/);
  assert.doesNotMatch(page, /method:\s*["']PATCH["']/);
  assert.doesNotMatch(page, /status=|params\.set\(["']search["']/);
});

test("transaction details use the supported sale lookup route and store ID", () => {
  const page = source("app/transactions/page.tsx");
  assert.match(page, /\/sales\/get\?/);
  assert.match(page, /id: String\(id\), store_id: String\(storeId\)/);
  assert.match(page, /api<\{ receipt: Receipt \}>/);
});

test("debts page lists supported customer balances without inventing repayment APIs", () => {
  const page = source("app/debts/page.tsx");
  assert.match(page, /\/customers\/owes\?store_id=/);
  assert.match(page, /total_outstanding/);
  assert.match(page, /outstanding_balance/);
  assert.doesNotMatch(page, /\/api\/debts/);
  assert.doesNotMatch(page, /method:\s*["']POST["']/);
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
  assert.match(helper, /credentials:\s*["']include["']/);
  assert.match(helper, /body\?\.data\s*\?\?\s*body/);
  assert.match(helper, /body\?\.error\?\.message/);
  assert.match(helper, /body\?\.error\?\.code/);
});
