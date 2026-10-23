import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");

test("feedback page uses the documented server endpoint and supported category values", () => {
  const page = source("app/feedback/page.tsx");
  assert.match(page, /api<\{ message\?: string \}>\("\/feedback"/);
  assert.match(page, /value="bug">Bug Report/);
  assert.match(page, /value="suggestion">Feature Request/);
  assert.match(page, /value="other">General Feedback/);
  assert.match(page, /submission_id:/);
  assert.match(page, /contact_name\?: string/);
  assert.match(page, /contact_email\?: string/);
});

test("feedback validates the documented 10 to 5000 character message range and optional email", () => {
  const page = source("app/feedback/page.tsx");
  assert.match(page, /MIN_MESSAGE_LENGTH = 10/);
  assert.match(page, /MAX_MESSAGE_LENGTH = 5000/);
  assert.match(page, /trimmedMessage\.length < MIN_MESSAGE_LENGTH/);
  assert.match(page, /trimmedMessage\.length > MAX_MESSAGE_LENGTH/);
  assert.match(page, /type="email"/);
  assert.match(page, /Enter a valid email address/);
});

test("feedback confirms success only after the server request resolves", () => {
  const page = source("app/feedback/page.tsx");
  assert.match(page, /const result = await api[\s\S]*?setSuccess\("Feedback submitted successfully/);
  assert.match(page, /FEEDBACK_DELIVERY_FAILED/);
  assert.match(page, /Connection was interrupted|connection was interrupted/i);
  assert.match(page, /role="status"/);
  assert.match(page, /role="alert"/);
});

test("feedback prevents duplicate requests and retries the exact payload after uncertain outcomes", () => {
  const page = source("app/feedback/page.tsx");
  assert.match(page, /if \(submitting \|\| attempt\) return/);
  assert.match(page, /disabled=\{submitting \|\| lockedForRecovery\}/);
  assert.match(page, /setAttempt\(payload\)/);
  assert.match(page, /void send\(attempt\)/);
  assert.match(page, /Retry same submission/);
});

test("feedback warns users not to submit sensitive account or payment credentials", () => {
  const page = source("app/feedback/page.tsx");
  assert.match(page, /Do not include passwords,[\s\S]*?payment-card details, bank credentials/);
});

test("feedback is reachable from the primary navigation", () => {
  const shell = source("components/layout/DashboardShell.tsx");
  assert.match(shell, /label: "Feedback", href: "\/feedback"/);
});
