import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");

test("stock recommendations use server results and reject missing or invalid legacy quantities", () => {
  const page = source("components/dashboard/LiveDashboard.tsx");

  assert.match(page, /brief\?\.insights\?\.restock_recommendations \?\? \[\]/);
  assert.match(page, /Number\.isSafeInteger\(item\.product_id\)/);
  assert.match(page, /Number\.isFinite\(item\.stock_quantity\)/);
  assert.match(page, /item\.low_stock_threshold !== null/);
  assert.match(page, /item\.stock_quantity <= item\.low_stock_threshold/);
  assert.match(page, /Physical products only/);
  assert.match(page, /Reorder threshold:/);
  assert.match(page, /No physical products currently meet a valid reorder threshold/);
  assert.doesNotMatch(page, /low_stock_threshold \?\? "not set"/);
});

test("dashboard refreshes server recommendations after inventory mutations and when returning to the tab", () => {
  const page = source("components/dashboard/LiveDashboard.tsx");
  const api = source("lib/api.ts");

  assert.match(api, /retailos:inventory-changed/);
  assert.match(api, /product\\\/(create\|update\|delete\|adjust\|receivings)/);
  assert.match(api, /sales\(\?:\\\/\.\*\)\?/);
  assert.match(page, /window\.addEventListener\("retailos:inventory-changed"/);
  assert.match(page, /document\.addEventListener\("visibilitychange"/);
  assert.match(page, /dashboard\/daily-brief\?/);
  assert.match(page, /refresh: true/);
});
