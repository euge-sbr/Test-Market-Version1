import { getAdminSession } from "@/client/auth/admin-auth";
import { getSupabaseServerConfig } from "@/shared/supabase/server";

const orderStatuses = ["pending", "confirmed", "preparing", "delivered", "cancelled"] as const;
type OrderStatus = (typeof orderStatuses)[number];

function getHeaders(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, "Content-Type": "application/json", ...extra };
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const headers = getHeaders(supabaseKey);
    const ordersUrl = new URL(`${supabaseUrl}/rest/v1/orders`);
    ordersUrl.searchParams.set("select", "*");
    ordersUrl.searchParams.set("shop_id", `eq.${session.shopId}`);
    ordersUrl.searchParams.set("order", "created_at.desc");
    ordersUrl.searchParams.set("limit", "200");
    const ordersResponse = await fetch(
      ordersUrl,
      { headers, cache: "no-store" },
    );

    if (!ordersResponse.ok) {
      console.error("Failed to load admin orders:", await ordersResponse.text());
      return Response.json({ error: "Could not load orders." }, { status: 502 });
    }

    const orders = (await ordersResponse.json()) as Array<Record<string, unknown> & { id: string }>;
    if (orders.length === 0) return Response.json({ orders: [] });

    const orderIds = orders.map((order) => order.id).join(",");
    const itemsUrl = new URL(`${supabaseUrl}/rest/v1/order_items`);
    itemsUrl.searchParams.set("select", "id,order_id,product_id,product_name,quantity,unit_price");
    itemsUrl.searchParams.set("order_id", `in.(${orderIds})`);
    const itemsResponse = await fetch(itemsUrl, { headers, cache: "no-store" });

    if (!itemsResponse.ok) {
      console.error("Failed to load admin order items:", await itemsResponse.text());
      return Response.json({ error: "Could not load order items." }, { status: 502 });
    }

    const items = (await itemsResponse.json()) as Array<Record<string, unknown> & { order_id: string }>;
    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      const orderItems = itemsByOrder.get(item.order_id) ?? [];
      orderItems.push(item);
      itemsByOrder.set(item.order_id, orderItems);
    }

    return Response.json({
      orders: orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) ?? [] })),
    });
  } catch (error) {
    console.error("Admin orders are unavailable:", error);
    return Response.json({ error: "Order service is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { orderId?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !orderStatuses.includes(status as OrderStatus)) {
    return Response.json({ error: "Invalid order or status." }, { status: 400 });
  }

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const url = new URL(`${supabaseUrl}/rest/v1/orders`);
    url.searchParams.set("id", `eq.${orderId}`);
    url.searchParams.set("shop_id", `eq.${session.shopId}`);
    const response = await fetch(
      url,
      {
        method: "PATCH",
        headers: getHeaders(supabaseKey, { Prefer: "return=representation" }),
        body: JSON.stringify({ status }),
      },
    );

    if (!response.ok) {
      console.error("Failed to update admin order:", await response.text());
      return Response.json({ error: "Could not update order status." }, { status: 502 });
    }

    const updatedOrders = (await response.json()) as Array<{ id: string }>;
    if (updatedOrders.length === 0) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }
    return Response.json({ updated: true });
  } catch (error) {
    console.error("Admin order update is unavailable:", error);
    return Response.json({ error: "Order service is unavailable." }, { status: 503 });
  }
}
