import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public pricing route is indexable and has its own metadata", async () => {
  const page = await read("../app/pricing/page.tsx");

  assert.ok(page.includes('title: "Pricing | TX RetailOS"'));
  assert.ok(page.includes('canonical: "/pricing"'));
  assert.ok(page.includes('robots: "index, follow"'));
  assert.match(page, /LandingPricingSection/);
});

test("public navigation links to pricing and is shared by the landing and pricing pages", async () => {
  const header = await read("../components/landing/PublicHeader.tsx");
  const home = await read("../app/page.tsx");
  const pricing = await read("../app/pricing/page.tsx");

  assert.match(header, /aria-label="Main navigation"/);
  assert.ok(header.includes('href="/pricing"'));
  assert.match(header, />\s*Pricing\s*</);
  assert.ok(header.includes('href="/login"'));
  assert.ok(header.includes('href="/register"'));
  assert.match(home, /<PublicHeader\s*\/>/);
  assert.match(pricing, /<PublicHeader\s*\/>/);
});

test("pricing route is public and does not require an authenticated session", async () => {
  const auth = await read("../components/auth/AuthProvider.tsx");

  assert.ok(auth.includes('"/pricing"'));
  assert.match(auth, /if \(isPublic\) return/);
});

test("public pricing reuses the server catalog and clearly discloses current release limitations", async () => {
  const pricing = await read("../components/landing/PricingSection.tsx");

  assert.match(pricing, /api<PlanCatalogResponse>\("\/subscriptions\/plans"\)/);
  assert.match(pricing, /proPlan\.billing_options/);
  assert.match(pricing, /trial\.duration_days/);
  assert.match(pricing, /Staff accounts/);
  assert.match(pricing, /Current release limitations/);
  assert.match(pricing, /advanced-reporting access controls/);
  assert.match(pricing, /dedicated export authorization/);
  assert.match(pricing, /staff-account management/);
  assert.match(pricing, /A Pro request is only recorded as pending/);
  assert.match(pricing, /does not collect payment or activate paid access/);
  assert.doesNotMatch(pricing, /wa\.me|Continue on WhatsApp/);
});
