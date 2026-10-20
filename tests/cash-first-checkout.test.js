import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const salesPage = readFileSync(new URL("../app/sales/page.tsx", import.meta.url), "utf8");

test("cash is the default payment method without saved payment setup", () => {
  assert.match(salesPage, /useState\("CASH"\)/);
  assert.doesNotMatch(salesPage, /localStorage\.getItem\("retailos-payment-method"\)/);
  assert.doesNotMatch(salesPage, /localStorage\.setItem\("retailos-payment-method"/);
  assert.match(salesPage, /No payment gateway is required; Cash is selected by default/);
});

test("cash sale uses the existing sales API and idempotency key", () => {
  assert.match(salesPage, /api<\{ receipt: Receipt \}>\("\/sales"/);
  assert.match(salesPage, /client_transaction_id: saleTransactionId/);
  assert.match(salesPage, /payment_method: paymentMethod === "CASH" \? "Cash"/);
  assert.match(salesPage, /amount_paid: amountPaid/);
});

test("checkout does not introduce tax configuration or invented tax rates", () => {
  assert.doesNotMatch(salesPage, /tax_rate|taxRate|VAT_RATE|VAT rate/i);
});
