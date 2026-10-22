import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import {
  encodeStripeForm,
  toCents,
  verifyStripeSignature,
} from "../shared/payments/stripe.ts";

describe("shared/payments/stripe", () => {
  it("converts dollar amounts to integer cents with rounding", () => {
    assert.equal(toCents(0), 0);
    assert.equal(toCents(6.25), 625);
    assert.equal(toCents(7.999), 800);
    assert.equal(toCents(19.99), 1999);
  });

  it("encodes nested objects and arrays in Stripe x-www-form-urlencoded format", () => {
    const pairs = encodeStripeForm({
      mode: "payment",
      empty: undefined,
      nil: null,
      metadata: { checkout_id: "chk_123" },
      line_items: [
        {
          quantity: 2,
          price_data: {
            currency: "usd",
            unit_amount: 650,
            product_data: { name: "Brown Sugar Boba" },
          },
        },
      ],
    });

    assert.deepEqual(pairs, [
      "mode=payment",
      "metadata%5Bcheckout_id%5D=chk_123",
      "line_items%5B0%5D%5Bquantity%5D=2",
      "line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=usd",
      "line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=650",
      "line_items%5B0%5D%5Bprice_data%5D%5Bproduct_data%5D%5Bname%5D=Brown%20Sugar%20Boba",
    ]);
  });

  it("verifies a valid Stripe webhook signature within tolerance", () => {
    const secret = "whsec_test_secret";
    const rawBody = JSON.stringify({ id: "evt_123", type: "checkout.session.completed" });
    const now = 1_700_000_000;
    const timestamp = now - 60;
    const sig = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
    const header = `t=${timestamp},v1=${sig}`;

    assert.equal(verifyStripeSignature(rawBody, header, secret, 300, now), true);
  });

  it("rejects a Stripe webhook signature signed with the wrong secret", () => {
    const rawBody = JSON.stringify({ id: "evt_123" });
    const now = 1_700_000_000;
    const sig = createHmac("sha256", "wrong_secret").update(`${now}.${rawBody}`).digest("hex");
    const header = `t=${now},v1=${sig}`;

    assert.equal(verifyStripeSignature(rawBody, header, "whsec_real_secret", 300, now), false);
  });

  it("rejects an expired Stripe webhook timestamp outside tolerance", () => {
    const secret = "whsec_test_secret";
    const rawBody = JSON.stringify({ id: "evt_123" });
    const now = 1_700_000_000;
    const oldTimestamp = now - 301;
    const sig = createHmac("sha256", secret).update(`${oldTimestamp}.${rawBody}`).digest("hex");
    const header = `t=${oldTimestamp},v1=${sig}`;

    assert.equal(verifyStripeSignature(rawBody, header, secret, 300, now), false);
  });

  it("rejects malformed or missing Stripe-Signature headers", () => {
    const secret = "whsec_test_secret";
    const rawBody = "{}";
    const now = 1_700_000_000;

    assert.equal(verifyStripeSignature(rawBody, null, secret, 300, now), false);
    assert.equal(verifyStripeSignature(rawBody, "", secret, 300, now), false);
    assert.equal(verifyStripeSignature(rawBody, "t=notanumber,v1=abcd", secret, 300, now), false);
    assert.equal(verifyStripeSignature(rawBody, `t=${now},v1=not-hex-at-all`, secret, 300, now), false);
    assert.equal(verifyStripeSignature(rawBody, `t=${now}`, secret, 300, now), false);
  });
});
