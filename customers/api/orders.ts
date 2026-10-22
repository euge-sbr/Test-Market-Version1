import { after } from "next/server";
import { sendOrderConfirmationEmail } from "@/shared/email/order-confirmation";
import { createCheckoutSession, isStripeConfigured, toCents } from "@/shared/payments/stripe";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/shared/rate-limit";
import { getSupabaseServerConfig } from "@/shared/supabase/server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  getPearlPriceAdjustment,
  getSizePriceAdjustment,
  isDrinkSize,
  isIceLevel,
  isPearlOption,
  isSugarLevel,
  type DrinkSize,
  type IceLevel,
  type PearlOption,
  type SugarLevel,
} from "@/customers/data/drink-options";

type OrderRequest = {
  customer?: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
  };
  delivery?: {
    address?: unknown;
    city?: unknown;
    postalCode?: unknown;
    note?: unknown;
  };
  paymentMethod?: unknown;
  items?: unknown;
};

type RequestedItem = {
  id?: unknown;
  quantity?: unknown;
  sugarLevel?: unknown;
  iceLevel?: unknown;
  pearls?: unknown;
  size?: unknown;
};

type NormalizedItem = {
  productId: string;
  quantity: number;
  sugarLevel: SugarLevel;
  iceLevel: IceLevel;
  pearls: PearlOption;
  size: DrinkSize;
};

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  if (!(await checkRateLimit("checkout", getClientIp(request), 10, 10 * 60))) {
    return tooManyRequests(600);
  }

  let body: OrderRequest;

  try {
    const parsedBody: unknown = await request.json();
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }
    body = parsedBody as OrderRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = textValue(body.customer?.name);
  const email = textValue(body.customer?.email);
  const phone = textValue(body.customer?.phone);
  const address = textValue(body.delivery?.address);
  const city = textValue(body.delivery?.city);
  const postalCode = textValue(body.delivery?.postalCode);
  const note = textValue(body.delivery?.note);
  const paymentMethod = textValue(body.paymentMethod);
  const requestedItems = Array.isArray(body.items) ? body.items as RequestedItem[] : [];

  if (!name || !email || !phone || !address || !city || !postalCode) {
    return Response.json({ error: "Please complete all required details." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["card", "cash"].includes(paymentMethod)) {
    return Response.json({ error: "Please provide valid contact and payment details." }, { status: 400 });
  }

  if (
    name.length > 120 || email.length > 254 || phone.length > 40 || address.length > 200 ||
    city.length > 100 || postalCode.length > 20 || note.length > 500 || requestedItems.length > 50
  ) {
    return Response.json({ error: "Some details are too long. Please shorten them and try again." }, { status: 400 });
  }

  if (paymentMethod === "card" && !isStripeConfigured()) {
    return Response.json({ error: "Card payments are not available yet. Please choose cash on delivery." }, { status: 400 });
  }

  const normalizedItems = requestedItems.map((item): NormalizedItem | null => {
    if (!item || typeof item !== "object") return null;
    const productId = textValue(item.id);
    const quantity = typeof item.quantity === "number" ? item.quantity : Number(item.quantity);
    if (
      !productId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99 ||
      !isSugarLevel(item.sugarLevel) ||
      !isIceLevel(item.iceLevel) ||
      !isPearlOption(item.pearls) ||
      !isDrinkSize(item.size)
    ) {
      return null;
    }
    return {
      productId,
      quantity,
      sugarLevel: item.sugarLevel,
      iceLevel: item.iceLevel,
      pearls: item.pearls,
      size: item.size,
    };
  });

  if (normalizedItems.length === 0 || normalizedItems.some((item) => item === null)) {
    return Response.json({ error: "Your cart contains an invalid item." }, { status: 400 });
  }

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const requestedProductIds = [...new Set(normalizedItems.map((item) => item!.productId))];
    const productsUrl = new URL(`${supabaseUrl}/rest/v1/products`);
    productsUrl.searchParams.set("select", "id,name,price,shop_id,shops!inner(name,is_active)");
    productsUrl.searchParams.set("id", `in.(${requestedProductIds.map((id) => `"${id.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`).join(",")})`);
    productsUrl.searchParams.set("is_available", "eq.true");
    productsUrl.searchParams.set("shops.is_active", "eq.true");
    const productsResponse = await fetch(productsUrl, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: "no-store",
    });
    if (!productsResponse.ok) {
      console.error("Could not validate order products:", await productsResponse.text());
      return Response.json({ error: "We could not verify your cart. Please try again." }, { status: 503 });
    }
    const catalog = await productsResponse.json() as Array<{
      id: string;
      name: string;
      price: number | string;
      shop_id: string;
      shops: { name: string };
    }>;
    const productsById = new Map(catalog.map((product) => [product.id, product]));
    const orderItems = normalizedItems.flatMap((item) => {
      if (!item) return [];
      const product = productsById.get(item.productId);
      if (!product) return [];
      return [{
        product_id: product.id,
        product_name: `${product.name} (${item.size}, ${item.sugarLevel}, ${item.iceLevel}, ${item.pearls})`,
        quantity: item.quantity,
        unit_price: Number(product.price) + getPearlPriceAdjustment(item.pearls) + getSizePriceAdjustment(item.size),
        shop_id: product.shop_id,
        shop_name: product.shops.name,
      }];
    });
    if (orderItems.length !== normalizedItems.length) {
      return Response.json({ error: "A product in your cart is no longer available. Refresh your cart and try again." }, { status: 409 });
    }

    const itemsByShop = new Map<string, typeof orderItems>();
    for (const item of orderItems) {
      const shopItems = itemsByShop.get(item.shop_id) ?? [];
      shopItems.push(item);
      itemsByShop.set(item.shop_id, shopItems);
    }

    const checkoutId = randomUUID();
    const createdOrders: Array<{ orderNumber: string; shopName: string; trackingToken: string; total: number }> = [];
    const orderPayloads = [...itemsByShop].map(([shopId, shopItems]) => {
      const orderNumber = `PP-${Date.now().toString().slice(-8)}-${randomUUID().slice(0, 4).toUpperCase()}`;
      const trackingToken = randomBytes(32).toString("base64url");
      const total = shopItems.reduce((sum, item) => sum + toCents(item.unit_price) * item.quantity, 0) / 100;
      createdOrders.push({ orderNumber, shopName: shopItems[0].shop_name, trackingToken, total });
      return {
        id: randomUUID(),
        checkout_id: checkoutId,
        shop_id: shopId,
        order_number: orderNumber,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        delivery_address: address,
        delivery_city: city,
        delivery_postal_code: postalCode,
        delivery_note: note,
        payment_method: paymentMethod,
        total,
        tracking_token_hash: createHash("sha256").update(trackingToken).digest("hex"),
        items: shopItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };
    });

    const supabaseHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    };

    // Prefer the single-transaction RPC (create_shop_orders in supabase/schema.sql).
    // If schema.sql hasn't been re-run in Supabase yet (404 PGRST202), fall back to direct REST inserts.
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_shop_orders`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({ p_orders: orderPayloads }),
      cache: "no-store",
    });

    if (!rpcResponse.ok) {
      const rpcErrorText = await rpcResponse.text();
      if (rpcResponse.status === 404 && rpcErrorText.includes("PGRST202")) {
        console.warn("create_shop_orders RPC not found in Supabase; using fallback REST inserts. Re-run supabase/schema.sql to enable atomic checkout.");
        const insertedOrderIds: string[] = [];
        const rollback = async () => {
          if (insertedOrderIds.length === 0) return;
          const rollbackUrl = new URL(`${supabaseUrl}/rest/v1/orders`);
          rollbackUrl.searchParams.set("id", `in.(${insertedOrderIds.join(",")})`);
          await fetch(rollbackUrl, { method: "DELETE", headers: supabaseHeaders }).catch(() => undefined);
        };

        for (const payload of orderPayloads) {
          const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
            method: "POST",
            headers: { ...supabaseHeaders, Prefer: "return=representation" },
            body: JSON.stringify({
              id: payload.id,
              shop_id: payload.shop_id,
              order_number: payload.order_number,
              customer_name: payload.customer_name,
              customer_email: payload.customer_email,
              customer_phone: payload.customer_phone,
              delivery_address: payload.delivery_address,
              delivery_city: payload.delivery_city,
              delivery_postal_code: payload.delivery_postal_code,
              delivery_note: payload.delivery_note || null,
              payment_method: payload.payment_method,
              total: payload.total,
              status: "pending",
              tracking_token_hash: payload.tracking_token_hash,
            }),
          });
          if (!orderResponse.ok) {
            console.error("Failed to create shop order:", await orderResponse.text());
            await rollback();
            return Response.json({ error: "We could not save your order. Please try again." }, { status: 500 });
          }
          insertedOrderIds.push(payload.id);

          const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/order_items`, {
            method: "POST",
            headers: supabaseHeaders,
            body: JSON.stringify(payload.items.map((item) => ({
              order_id: payload.id,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
            }))),
          });
          if (!itemsResponse.ok) {
            console.error("Failed to create order items:", await itemsResponse.text());
            await rollback();
            return Response.json({ error: "We could not save your order items. Please try again." }, { status: 500 });
          }
        }
      } else {
        console.error("Failed to create shop orders:", rpcErrorText);
        return Response.json({ error: "We could not save your order. Please try again." }, { status: 500 });
      }
    }

    const siteUrl = (process.env.SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin);
    const trackingUrlFor = (token: string) => `${siteUrl}/orders/track#${token}`;
    const responseOrders = createdOrders.map(({ orderNumber, shopName, trackingToken }) => ({ orderNumber, shopName, trackingToken }));

    // Email the private tracking links so customers can find their orders later.
    // Scheduled with after() so a slow email provider never delays checkout.
    const scheduleConfirmationEmail = () => after(() => sendOrderConfirmationEmail({
      to: email,
      customerName: name,
      paymentMethod: paymentMethod as "card" | "cash",
      orders: createdOrders.map((order) => ({
        orderNumber: order.orderNumber,
        shopName: order.shopName,
        total: order.total,
        trackingUrl: trackingUrlFor(order.trackingToken),
      })),
    }).catch((error) => console.error("Order confirmation email failed:", error)));

    if (paymentMethod !== "card") {
      scheduleConfirmationEmail();
      return Response.json({ orders: responseOrders }, { status: 201 });
    }

    try {
      const session = await createCheckoutSession({
        checkoutId,
        customerEmail: email,
        successUrl: `${siteUrl}/orders/track?payment=success`,
        cancelUrl: `${siteUrl}/checkout?payment=cancelled`,
        lineItems: orderItems.map((item) => ({
          name: item.product_name,
          description: `Sold by ${item.shop_name}`,
          unitAmountCents: toCents(item.unit_price),
          quantity: item.quantity,
        })),
      });
      await fetch(`${supabaseUrl}/rest/v1/orders?checkout_id=eq.${checkoutId}`, {
        method: "PATCH",
        headers: supabaseHeaders,
        body: JSON.stringify({ stripe_session_id: session.id }),
      }).catch((error) => console.error("Could not store Stripe session id:", error));
      scheduleConfirmationEmail();
      return Response.json({ orders: responseOrders, paymentUrl: session.url }, { status: 201 });
    } catch (error) {
      console.error("Could not start card payment:", error);
      // Cancel the unpaid orders so shops never see them.
      await fetch(`${supabaseUrl}/rest/v1/orders?checkout_id=eq.${checkoutId}`, {
        method: "PATCH",
        headers: supabaseHeaders,
        body: JSON.stringify({ payment_status: "expired", status: "cancelled" }),
      }).catch((cancelError) => console.error("Could not cancel unpaid orders:", cancelError));
      return Response.json({ error: "We could not start the card payment. Please try again or choose cash on delivery." }, { status: 502 });
    }
  } catch (error) {
    console.error("Order checkout failed:", error);
    return Response.json({ error: "We could not save your order. Please try again." }, { status: 503 });
  }
}
