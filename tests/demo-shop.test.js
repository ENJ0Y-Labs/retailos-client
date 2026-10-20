import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("demo route is public and linked from the landing page", async () => {
  const auth = await read("../components/auth/AuthProvider.tsx");
  const home = await read("../app/page.tsx");
  assert.match(auth, /PUBLIC_PATHS\s*=\s*\[[^\]]*["']\/demo["']/);
  assert.match(home, /href="\/demo"/);
  assert.match(home, /Try the demo shop/);
});

test("demo shop includes at least ten categorized sample products and reset", async () => {
  const demo = await read("../app/demo/page.tsx");
  assert.match(demo, /const SEED_PRODUCTS/);
  assert.equal((demo.match(/\{ id: \d+, name:/g) || []).length >= 10, true);
  assert.match(demo, /category:/);
  assert.match(demo, /initialStock:/);
  assert.match(demo, /Reset demo shop/);
  assert.match(demo, /setProducts\(SEED_PRODUCTS\.map/);
});

test("demo sale never calls the real API or persists demo data", async () => {
  const demo = await read("../app/demo/page.tsx");
  assert.doesNotMatch(demo, /from ["']@\/lib\/api["']/);
  assert.doesNotMatch(demo, /localStorage|sessionStorage|fetch\(/);
  assert.match(demo, /No real sale, inventory, or financial record was created/);
  assert.match(demo, /Payment: cash \(simulated\)/);
});

test("demo route is excluded from search indexing", async () => {
  const layout = await read("../app/demo/layout.tsx");
  assert.match(layout, /index:\s*false/);
});
