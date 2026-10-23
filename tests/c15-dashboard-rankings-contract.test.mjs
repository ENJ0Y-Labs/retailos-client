import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");

test("dashboard rankings use the documented server response and distinct measures", () => {
  const page = source("components/dashboard/LiveDashboard.tsx");
  const types = source("lib/types.ts");

  assert.match(page, /\/dashboard\/rankings\?/);
  assert.match(page, /start_date: periodStart/);
  assert.match(page, /end_date: periodEnd/);
  assert.match(page, /refresh: true/);
  assert.match(types, /top_selling_products: Array<[\s\S]*?units_sold: number;[\s\S]*?unit: string;/);
  assert.match(types, /top_services: Array<[\s\S]*?completed_orders: number;/);
  assert.match(page, /Top-selling products/);
  assert.match(page, /Top services/);
  assert.match(page, /units_sold/);
  assert.match(page, /completed_orders/);
  assert.match(page, /service orders/);
});

test("dashboard ranking filters refresh for selected dates and display the server reporting period", () => {
  const page = source("components/dashboard/LiveDashboard.tsx");

  assert.match(page, /type="date" value=\{periodStart\}/);
  assert.match(page, /type="date" value=\{periodEnd\}/);
  assert.match(page, /onChange=\{\(event\) => onPeriodStartChange/);
  assert.match(page, /onChange=\{\(event\) => onPeriodEndChange/);
  assert.match(page, /reportedPeriod\.start_date/);
  assert.match(page, /reportedPeriod\.end_date/);
  assert.match(page, /reportedPeriod\.timezone/);
  assert.match(page, /Start date must be on or before end date/);
});

test("dashboard rankings distinguish empty, loading, and failed states", () => {
  const page = source("components/dashboard/LiveDashboard.tsx");

  assert.match(page, /Loading product and service rankings/);
  assert.match(page, /No physical product units were sold in this reporting period/);
  assert.match(page, /No qualifying service orders were recorded in this reporting period/);
  assert.match(page, /Rankings could not be loaded:/);
  assert.match(page, /Retry rankings/);
  assert.match(page, /net base units sold after recorded returns/);
  assert.match(page, /Each sale counts once per service/);
  assert.doesNotMatch(page, /rankings\.top_services\.map\(\(item\) => \(\{ id: item\.service_id, name: item\.service_name, measure: item\.completed_orders, unit: "units"/);
});
