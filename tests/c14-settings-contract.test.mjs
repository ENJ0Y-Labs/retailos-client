import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");

test("store settings uses the supported owner-authorized API and refreshes shared store details", () => {
  const page = source("app/settings/page.tsx");
  assert.match(page, /api<\{ store: \{ id: number; name: string \} \}>\("\/settings\/store"/);
  assert.match(page, /method: "PATCH"/);
  assert.match(page, /json: \{ store_id: user\.store_id, name: normalizedName \}/);
  assert.match(page, /const refreshedUser = await refresh\(\)/);
  assert.match(page, /refreshedUser\?\.store_name === result\.store\.name/);
  assert.match(page, /Store name saved successfully/);
  assert.match(page, /role="alert"/);
  assert.match(page, /storeSubmitLock\.current/);
});

test("password change follows the server contract and requires confirmation before submission", () => {
  const page = source("app/settings/page.tsx");
  assert.match(page, /api\("\/auth\/change-password"/);
  assert.match(page, /current_password: currentPassword, new_password: newPassword/);
  assert.match(page, /newPassword !== confirmPassword/);
  assert.match(page, /72 UTF-8 bytes|72-byte limit/);
  assert.match(page, /passwordSubmitLock\.current/);
  assert.match(page, /setPasswordError\(errorMessage\(error/);
  assert.match(page, /router\.replace\("\/login\?reason=password-changed"\)/);
  assert.doesNotMatch(page, /console\.(log|error)\([^)]*(currentPassword|newPassword|confirmPassword)/);
});

test("PIN stays separate and unavailable controls do not pretend to work", () => {
  const page = source("app/settings/page.tsx");
  assert.match(page, /PIN setup is not available yet/);
  assert.match(page, /disabled className=/);\n  assert.match(page, /PIN setup unavailable/);
  assert.doesNotMatch(page, /api\([^)]*pin/i);
});

test("login explains that a successfully changed password requires a new sign-in", () => {
  const page = source("app/login/page.tsx");
  assert.match(page, /reason === "password-changed"/);
  assert.match(page, /Password changed successfully\. Sign in with your new password/);
  assert.match(page, /currentReason === "session-expired"/);
});


test("incorrect current password is shown in Settings instead of being treated as an expired session", () => {
  const api = source("lib/api.ts");
  assert.match(api, /path === "\/auth\/change-password" && body\?\.error\?\.code === "AUTH_INVALID_CURRENT_PASSWORD"/);
  assert.match(api, /!isIncorrectCurrentPassword/);
});
