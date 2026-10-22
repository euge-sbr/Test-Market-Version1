import { createHash } from "node:crypto";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/shared/rate-limit";
import { getSupabaseServerConfig } from "@/shared/supabase/server";

type TrackingRequest = {
  trackingTokens?: unknown;
};

const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function POST(request: Request) {
  // The tracking page polls every 15s, so allow ~2 tabs of polling plus manual lookups.
  if (!(await checkRateLimit("track", getClientIp(request), 120, 15 * 60))) {
    return tooManyRequests(60);
  }

  let body: TrackingRequest | null;
  try {
    body = await request.json() as TrackingRequest | null;
  } catch {
    return Response.json({ error: "Enter a valid tracking code." }, { status: 400 });
  }

  if (
    !body ||
    !Array.isArray(body.trackingTokens) ||
    body.trackingTokens.length < 1 ||
    body.trackingTokens.length > 50 ||
    body.trackingTokens.some((token) => typeof token !== "string" || !TRACKING_TOKEN_PATTERN.test(token))
  ) {
    return Response.json({ error: "Enter a valid tracking code." }, { status: 400 });
  }

  const tokenHashes = [...new Set(
    (body.trackingTokens as string[]).map((token) => createHash("sha256").update(token).digest("hex")),
  )];

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
    const ordersUrl = new URL(`${supabaseUrl}/rest/v1/orders`);
    ordersUrl.searchParams.set(
      "select",
      "order_number,status,payment_status,total,created_at,shops(name),order_items(id,product_id,product_name,quantity,unit_price)",
    );
    ordersUrl.searchParams.set("tracking_token_hash", `in.(${tokenHashes.join(",")})`);
    ordersUrl.searchParams.set("order", "created_at.desc");

    let response = await fetch(ordersUrl, { headers, cache: "no-store" });
    if (!response.ok && response.status === 400) {
      // Fallback if payment_status column from supabase/schema.sql hasn't been applied yet.
      ordersUrl.searchParams.set(
        "select",
        "order_number,status,total,created_at,shops(name),order_items(id,product_id,product_name,quantity,unit_price)",
      );
      response = await fetch(ordersUrl, { headers, cache: "no-store" });
    }
    if (!response.ok) {
      console.error("Could not load customer order tracking:", await response.text());
      return Response.json({ error: "Order tracking is temporarily unavailable." }, { status: 503 });
    }

    const rows = await response.json() as Array<{
      order_number: string;
      status: string;
      payment_status?: string;
      total: number | string;
      created_at: string;
      shops: { name: string } | null;
      order_items?: Array<{
        id: string;
        product_id?: string | null;
        product_name: string;
        quantity: number;
        unit_price: number | string;
      }> | null;
    }>;
    if (rows.length === 0) {
      return Response.json({ error: "We couldn’t find an order for that tracking code." }, { status: 404 });
    }

    return Response.json({
      orders: rows.map((order) => ({
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status ?? "cash_on_delivery",
        total: Number(order.total),
        createdAt: order.created_at,
        shopName: order.shops?.name ?? "Store",
        items: (order.order_items ?? []).map((item) => ({
          id: item.id,
          productId: item.product_id ?? undefined,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
        })),
      })),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Customer order tracking is unavailable:", error);
    return Response.json({ error: "Order tracking is temporarily unavailable." }, { status: 503 });
  }
}
