import { getSupabaseServerConfig } from "@/shared/supabase/server";

export async function GET() {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const productsUrl = new URL(`${supabaseUrl}/rest/v1/products`);
    productsUrl.searchParams.set("select", "id,name,description,category,price,image_url,rating,is_available,created_at,shops!inner(name,is_active)");
    productsUrl.searchParams.set("is_available", "eq.true");
    productsUrl.searchParams.set("shops.is_active", "eq.true");
    productsUrl.searchParams.set("order", "created_at.asc");

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };
    const salesUrl = new URL(`${supabaseUrl}/rest/v1/order_items`);
    salesUrl.searchParams.set("select", "product_id,quantity,orders!inner(status)");
    salesUrl.searchParams.set("orders.status", "neq.cancelled");
    salesUrl.searchParams.set("limit", "10000");

    const response = await fetch(productsUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Could not load customer catalog:", await response.text());
      return Response.json({ error: "The drink menu is temporarily unavailable." }, { status: 503 });
    }
    const salesResponse = await fetch(salesUrl, { headers, cache: "no-store" });
    if (!salesResponse.ok) {
      console.error("Could not load product sales:", await salesResponse.text());
      return Response.json({ error: "Product recommendations are temporarily unavailable." }, { status: 503 });
    }

    const rows = await response.json() as Array<Record<string, unknown>>;
    const sales = await salesResponse.json() as Array<{ product_id: string; quantity: number }>;
    const unitsSoldByProduct = new Map<string, number>();
    for (const sale of sales) {
      unitsSoldByProduct.set(
        sale.product_id,
        (unitsSoldByProduct.get(sale.product_id) ?? 0) + Number(sale.quantity),
      );
    }
    const bestSellerRankByProduct = new Map(
      [...unitsSoldByProduct.entries()]
        .sort(([firstId, firstSales], [secondId, secondSales]) =>
          secondSales - firstSales || firstId.localeCompare(secondId),
        )
        .map(([productId], index) => [productId, index + 1]),
    );
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const products = rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      shop_name: row.shops && typeof row.shops === "object" && "name" in row.shops && typeof row.shops.name === "string"
        ? row.shops.name
        : "",
      description: String(row.description ?? ""),
      category: String(row.category ?? "Milk Tea"),
      price: Number(row.price),
      image: typeof row.image_url === "string" ? row.image_url : "",
      rating: row.rating == null ? undefined : Number(row.rating),
      is_available: row.is_available === true,
      created_at: String(row.created_at),
      best_seller_rank: bestSellerRankByProduct.get(String(row.id)) ?? null,
      is_new_this_week: Date.parse(String(row.created_at)) >= oneWeekAgo && Date.parse(String(row.created_at)) <= now,
    }));

    return Response.json({ products });
  } catch (error) {
    console.error("Customer catalog is unavailable:", error);
    return Response.json({ error: "The drink menu is temporarily unavailable." }, { status: 503 });
  }
}