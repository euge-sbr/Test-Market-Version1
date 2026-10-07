import { createHash } from "node:crypto";

import { getSupabaseServerConfig } from "@/shared/supabase/server";

type TrackingRequest = {
  trackingTokens?: unknown;
};

const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function POST(request: Request) {
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
    const ordersUrl = new URL(`${supabaseUrl}/rest/v1/orders`);
    ordersUrl.searchParams.set("select", "order_number,status,total,created_at,shops(name)");
    ordersUrl.searchParams.set("tracking_token_hash", `in.(${tokenHashes.join(",")})`);

    const response = await fetch(ordersUrl, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Could not load customer order tracking:", await response.text());
      return Response.json({ error: "Order tracking is temporarily unavailable." }, { status: 503 });
    }

    const rows = await response.json() as Array<{
      order_number: string;
      status: string;
      total: number | string;
      created_at: string;
      shops: { name: string } | null;
    }>;
    if (rows.length === 0) {
      return Response.json({ error: "We couldn’t find an order for that tracking code." }, { status: 404 });
    }

    return Response.json({
      orders: rows.map((order) => ({
        orderNumber: order.order_number,
        status: order.status,
        total: Number(order.total),
        createdAt: order.created_at,
        shopName: order.shops?.name ?? "Store",
      })),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Customer order tracking is unavailable:", error);
    return Response.json({ error: "Order tracking is temporarily unavailable." }, { status: 503 });
  }
}
