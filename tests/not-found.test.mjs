import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const notFoundPage = new URL("../app/not-found.tsx", import.meta.url);

test("the App Router has a branded global not-found page", async () => {
  const source = await readFile(notFoundPage, "utf8");

  assert.match(source, /export default function NotFound/);
  assert.match(source, /TX RetailOS/);
  assert.match(source, /Page not found \| TX RetailOS/);
  assert.match(source, /We can’t find that page/);
  assert.match(source, /href="\/"/);
  assert.match(source, /Back to home/);
  assert.match(source, /aria-labelledby="not-found-title"/);
  assert.match(source, /focus-visible:outline/);
});

test("the not-found page does not expose an unconditional dashboard shortcut", async () => {
  const source = await readFile(notFoundPage, "utf8");

  assert.doesNotMatch(source, /href="\/dashboard"/);
});
