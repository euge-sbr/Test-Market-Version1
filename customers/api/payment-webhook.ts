import { verifyStripeSignature } from "@/shared/payments/stripe";
import { getSupabaseServerConfig } from "@/shared/supabase/server";

type StripeEvent = {
  type?: string;
  data?: { object?: { id?: string; payment_status?: string; metadata?: { checkout_id?: string } } };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function updateCheckoutOrders(checkoutId: string, fromStatus: string, updates: Record<string, string>) {
  const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/orders`);
  url.searchParams.set("checkout_id", `eq.${checkoutId}`);
  // Only move forward from the expected state, so replayed or out-of-order events are harmless.
  url.searchParams.set("payment_status", `eq.${fromStatus}`);
  const response = await fetch(url, {
    method: "PATCH",
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Order payment update failed: ${response.status} ${await response.text()}`);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set; rejecting webhook.");
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), secret)) {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const session = event.data?.object;
  const checkoutId = session?.metadata?.checkout_id;
  if (!checkoutId || !UUID_PATTERN.test(checkoutId)) {
    // Not one of our checkout sessions; acknowledge so Stripe stops retrying.
    return Response.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        if (session?.payment_status === "paid") {
          await updateCheckoutOrders(checkoutId, "awaiting_payment", { payment_status: "paid" });
        }
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await updateCheckoutOrders(checkoutId, "awaiting_payment", { payment_status: "expired", status: "cancelled" });
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    // A 5xx makes Stripe retry later.
    return Response.json({ error: "Could not process event." }, { status: 500 });
  }

  return Response.json({ received: true });
}
