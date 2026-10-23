import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("authenticated navigation exposes plans and landing page no longer markets pricing", () => {
  const shell = read("../components/layout/DashboardShell.tsx");
  const home = read("../app/page.tsx");

  assert.match(shell, /Plans & subscription|View plans|Upgrade/);
  assert.match(shell, /href: "\/plans"/);
  assert.doesNotMatch(home, /Simple to begin\. Clear about pricing\./);
  assert.doesNotMatch(home, /public plan prices are not published/i);
});

test("plans page reads the authoritative catalog and current subscription from Flask", () => {
  const page = read("../app/plans/page.tsx");

  assert.match(page, /\/subscriptions\/plans/);
  assert.match(page, /\/subscriptions\?store_id=/);
  assert.match(page, /\/subscriptions\/change/);
  assert.match(page, /\/subscriptions\/trial/);
  assert.match(page, /billing_options/);
  assert.match(page, /Feature comparison/);
  assert.match(page, /Current plan/);
  assert.match(page, /Plan information unavailable/);
  assert.match(page, /Retry loading plans/);
});

test("plan requests are not represented as paid activation or purchase success", () => {
  const page = read("../app/plans/page.tsx");

  assert.match(page, /activation === "not_activated"/);
  assert.match(page, /Paid billing is not configured/);
  assert.match(page, /Requesting a plan is not a purchase/);
  assert.match(page, /current plan remains authoritative/i);
  assert.match(page, /\/subscriptions\/change\/cancel/);
});

test("the UI uses server plan names and does not invent unsupported Basic tiers", () => {
  const page = read("../app/plans/page.tsx");

  assert.match(page, /plans\.map\(\(plan\)/);
  assert.doesNotMatch(page, /name: "Basic"|name: "Intermediate"|name: "Advanced"/);
});
