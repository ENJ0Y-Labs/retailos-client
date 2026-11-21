import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public pricing separates free registration from authenticated Pro actions", async () => {
  const pricing = await read("../components/landing/PricingSection.tsx");
  assert.ok(pricing.includes('href="/register"'));
  assert.ok(pricing.includes("Sign in to request Pro"));
  assert.ok(pricing.includes("Eligible stores can start a"));
  assert.ok(pricing.includes("plansSignInHref"));
  assert.ok(pricing.includes("The server grants one 14-day trial per eligible store."));
  assert.ok(pricing.includes("does not collect payment or activate paid access"));
  assert.ok(!pricing.includes("wa.me") && !pricing.includes("Continue on WhatsApp"));
});

test("public pricing carries the selected billing interval into the authenticated plans page", async () => {
  const pricing = await read("../components/landing/PricingSection.tsx");
  const plans = await read("../app/plans/page.tsx");
  assert.ok(pricing.includes('/plans?interval=${interval}'));
  assert.ok(plans.includes('new URLSearchParams(window.location.search).get("interval")'));
  assert.ok(plans.includes('requestedInterval === "year"'));
});

test("Pro requests use the server plan-change endpoint and never claim activation", async () => {
  const plans = await read("../app/plans/page.tsx");
  assert.ok(plans.includes('"/subscriptions/change"'));
  assert.ok(plans.includes('activation === "not_activated"'));
  assert.ok(plans.includes("Your request to change to ${plan.name} is pending"));
  assert.ok(plans.includes("No payment was collected"));
  assert.ok(plans.includes("Submitting this request does not start a checkout, collect payment, or activate Pro"));
  assert.ok(!plans.includes("wa.me") && !plans.includes("Continue on WhatsApp"));
});

test("trial starts only through the server and exposes success, failure, and already-used states", async () => {
  const plans = await read("../app/plans/page.tsx");
  assert.ok(plans.includes('"/subscriptions/trial"'));
  assert.ok(plans.includes("The server confirmed your ${result.trial.duration_days}-day Pro trial"));
  assert.ok(plans.includes("RetailOS could not start the trial"));
  assert.ok(plans.includes("already used its one-time Pro trial"));
});

test("authentication redirects preserve a safe same-origin destination", async () => {
  const auth = await read("../components/auth/AuthProvider.tsx");
  const login = await read("../app/login/page.tsx");
  const register = await read("../app/register/page.tsx");
  assert.ok(auth.includes('next=${encodeURIComponent(pathname || "/dashboard")}'));
  assert.ok(login.includes('next.startsWith("/") && !next.startsWith("//")'));
  assert.ok(login.includes("router.push(nextPath)"));
  assert.ok(register.includes("encodeURIComponent(nextPath)"));
});

test("subscription screen has explicit loading, network error, pending, and retry states", async () => {
  const plans = await read("../app/plans/page.tsx");
  assert.ok(plans.includes("Loading plan catalog and current subscription"));
  assert.ok(plans.includes("Plan information unavailable"));
  assert.ok(plans.includes("Retry loading plans"));
  assert.ok(plans.includes("Plan change pending"));
  assert.ok(plans.includes("This request has not activated the target plan"));
});