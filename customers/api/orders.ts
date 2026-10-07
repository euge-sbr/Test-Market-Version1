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

  if (!email.includes("@") || !["card", "cash"].includes(paymentMethod)) {
    return Response.json({ error: "Please provide valid contact and payment details." }, { status: 400 });
  }

  const normalizedItems = requestedItems.map((item): NormalizedItem | null => {
    if (!item || typeof item !== "object") return null;
    const productId = textValue(item.id);
    const quantity = typeof item.quantity === "number" && Number.isInteger(item.quantity) ? item.quantity : 0;
    if (
      !productId ||
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

  let rollbackCreatedOrders: (() => Promise<void>) | undefined;
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

    const supabaseHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    };
    const rollbackOrderIds: string[] = [];
    rollbackCreatedOrders = async () => {
      const results = await Promise.allSettled(rollbackOrderIds.map(async (id) => {
        const response = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${id}`, {
          method: "DELETE",
          headers: supabaseHeaders,
        });
        if (!response.ok) {
          throw new Error(`Order rollback returned HTTP ${response.status}.`);
        }
      }));
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length > 0) {
        console.error("Could not roll back every incomplete shop order:", failures);
      }
    };
    const itemsByShop = new Map<string, typeof orderItems>();
    for (const item of orderItems) {
      const shopItems = itemsByShop.get(item.shop_id) ?? [];
      shopItems.push(item);
      itemsByShop.set(item.shop_id, shopItems);
    }

    const createdOrders: Array<{
      id: string;
      order_number: string;
      shop_name: string;
      trackingToken: string;
    }> = [];
    for (const [shopId, shopItems] of itemsByShop) {
      const total = shopItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      const orderId = randomUUID();
      const orderNumber = `PP-${Date.now().toString().slice(-8)}-${randomUUID().slice(0, 4).toUpperCase()}`;
      const trackingToken = randomBytes(32).toString("base64url");
      const trackingTokenHash = createHash("sha256").update(trackingToken).digest("hex");
      rollbackOrderIds.push(orderId);
      const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
        method: "POST",
        headers: { ...supabaseHeaders, Prefer: "return=representation" },
        body: JSON.stringify({
          id: orderId,
          shop_id: shopId,
          order_number: orderNumber,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          delivery_address: address,
          delivery_city: city,
          delivery_postal_code: postalCode,
          delivery_note: note || null,
          payment_method: paymentMethod,
          total,
          status: "pending",
          tracking_token_hash: trackingTokenHash,
        }),
      });
      const orderData = await orderResponse.json();
      const order = orderData[0] as { id: string; order_number: string } | undefined;
      if (!orderResponse.ok || !order) {
        await rollbackCreatedOrders();
        console.error("Failed to create shop order:", orderData);
        return Response.json({ error: "We could not save your order." }, { status: 500 });
      }
      createdOrders.push({ ...order, shop_name: shopItems[0].shop_name, trackingToken });

      const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/order_items`, {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(shopItems.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))),
      });
      if (!itemsResponse.ok) {
        const details = await itemsResponse.text();
        await rollbackCreatedOrders();
        console.error("Failed to create order items:", details);
        return Response.json({ error: "We could not save your order items." }, { status: 500 });
      }
    }

    return Response.json({
      orders: createdOrders.map(({ order_number, shop_name, trackingToken }) => ({
        orderNumber: order_number,
        shopName: shop_name,
        trackingToken,
      })),
    }, { status: 201 });
  } catch (error) {
    if (rollbackCreatedOrders) {
      await rollbackCreatedOrders();
      console.error("Order checkout failed:", error);
      return Response.json({ error: "We could not save your order. Please try again." }, { status: 500 });
    }
    console.error("Supabase is not configured:", error);
    return Response.json({ error: "Supabase is not configured yet." }, { status: 503 });
  }
}
