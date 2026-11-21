import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public pricing separates free registration from authenticated Pro actions", async () => {
  const pricing = await read("../components/landing/PricingSection.tsx");
  assert.match(pricing, /href="\\/register"/);
  assert.match(pricing, /Sign in to request Pro/);
  assert.match(pricing, /Eligible stores can start a/);
  assert.match(pricing, /plansSignInHref/);
  assert.match(pricing, /does not collect payment or activate paid access/);
  assert.doesNotMatch(pricing, /wa\\.me|Continue on WhatsApp/);
});

test("public pricing carries the selected billing interval to the authenticated plans page", async () => {
  const pricing = await read("../components/landing/PricingSection.tsx");
  const plans = await read("../app/plans/page.tsx");
  assert.match(pricing, /interval=\\$\\{interval\\}/);
  assert.match(plans, /requestedInterval === "month" \\|\\| requestedInterval === "quarter" \\|\\| requestedInterval === "year"/);
});

test("Pro requests use the server plan-change endpoint and never claim activation", async () => {
  const plans = await read("../app/plans/page.tsx");
  assert.match(plans, /api<PlanChangeResponse>\\("\\/subscriptions\\/change"/);
  assert.match(plans, /activation === "not_activated"/);
  assert.match(plans, /Your request to change to \\$\\{plan\\.name\\} is pending/);
  assert.match(plans, /No payment was collected/);
  assert.match(plans, /Submitting this request does not start a checkout, collect payment, or activate Pro/);
  assert.doesNotMatch(plans, /wa\\.me|Continue on WhatsApp/);
});

test("trial starts only through the server and exposes success, failure, and already-used states", async () => {
  const plans = await read("../app/plans/page.tsx");
  assert.match(plans, /"\\/subscriptions\\/trial"/);
  assert.match(plans, /The server confirmed your \\$\\{result\\.trial\\.duration_days\\}-day Pro trial/);
  assert.match(plans, /RetailOS could not start the trial/);
  assert.match(plans, /already used its one-time Pro trial/);
});

test("authentication redirects preserve a safe same-origin destination", async () => {
  const auth = await read("../components/auth/AuthProvider.tsx");
  const login = await read("../app/login/page.tsx");
  const register = await read("../app/register/page.tsx");
  assert.match(auth, /next=\\$\\{encodeURIComponent\\(pathname \\|\\| "\\/dashboard"\\)\\}/);
  assert.match(login, /next\\.startsWith\\("\\/"\\) && !next\\.startsWith\\("\\/\\/"\\)/);
  assert.match(login, /router\\.push\\(nextPath\\)/);
  assert.match(register, /encodeURIComponent\\(nextPath\\)/);
});

test("subscription screen has explicit loading, network error, pending, and retry states", async () => {
  const plans = await read("../app/plans/page.tsx");
  assert.match(plans, /Loading plan catalog and current subscription/);
  assert.match(plans, /Plan information unavailable/);
  assert.match(plans, /Retry loading plans/);
  assert.match(plans, /Plan change pending/);
  assert.match(plans, /This request has not activated the target plan/);
});