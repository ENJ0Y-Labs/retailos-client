import assert from "node:assert/strict";
import test from "node:test";

import { formatNigeriaDate, formatNigeriaDateTime } from "../lib/nigeria-time-core.mjs";

test("formats timestamps in Africa/Lagos rather than UTC", () => {
  const formatted = formatNigeriaDateTime("2026-10-19T00:00:00.000Z");
  assert.match(formatted, /19 Oct 2026/i);
  assert.match(formatted, /1:00/i);
});

test("formats the backend reporting date without shifting its calendar day", () => {
  const formatted = formatNigeriaDate("2026-10-19T12:00:00+01:00");
  assert.match(formatted, /19 Oct 2026/i);
});

test("converts UTC timestamps across midnight into the Lagos reporting day", () => {
  const formatted = formatNigeriaDateTime("2026-10-18T23:30:00.000Z");
  assert.match(formatted, /19 Oct 2026/i);
  assert.match(formatted, /12:30/i);
});
