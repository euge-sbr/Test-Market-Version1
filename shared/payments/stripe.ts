import { createHmac, timingSafeEqual } from "node:crypto";

// Minimal Stripe client using the REST API directly (no SDK dependency).

export type StripeLineItem = {
  name: string;
  description?: string;
  unitAmountCents: number;
  quantity: number;
};

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Encodes nested objects the way Stripe expects: a[b][0][c]=value */
export function encodeStripeForm(data: Record<string, unknown>, prefix = ""): string[] {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") {
      pairs.push(...encodeStripeForm(value as Record<string, unknown>, name));
    } else {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return pairs;
}

export async function createCheckoutSession(options: {
  checkoutId: string;
  customerEmail: string;
  lineItems: StripeLineItem[];
  successUrl: string;
  cancelUrl: string;
  currency?: string;
}): Promise<{ id: string; url: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured.");

  const body = encodeStripeForm({
    mode: "payment",
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    customer_email: options.customerEmail,
    client_reference_id: options.checkoutId,
    // Unpaid sessions expire after 30 minutes (Stripe's minimum); the webhook then cancels the orders.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: { checkout_id: options.checkoutId },
    payment_intent_data: { metadata: { checkout_id: options.checkoutId } },
    line_items: options.lineItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: options.currency ?? process.env.STRIPE_CURRENCY ?? "usd",
        unit_amount: item.unitAmountCents,
        product_data: { name: item.name, ...(item.description ? { description: item.description } : {}) },
      },
    })),
  }).join("&");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `checkout-${options.checkoutId}`,
    },
    body,
    cache: "no-store",
  });
  const result = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !result.id || !result.url) {
    throw new Error(`Stripe checkout session failed: ${result.error?.message ?? response.status}`);
  }
  return { id: result.id, url: result.url };
}

/**
 * Verifies a Stripe-Signature header (t=timestamp,v1=signature) against the raw body.
 * https://docs.stripe.com/webhooks#verify-manually
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(",").map((part) => part.trim().split("="));
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1]);
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value ?? "");
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/.test(signature)) return false;
    const supplied = Buffer.from(signature, "hex");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}
