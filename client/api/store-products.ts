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
    // Sales are aggregated in the database (see the product_sales view in supabase/schema.sql).
    const salesUrl = new URL(`${supabaseUrl}/rest/v1/product_sales`);
    salesUrl.searchParams.set("select", "product_id,units_sold");

    const [response, salesResponse] = await Promise.all([
      fetch(productsUrl, { headers, cache: "no-store" }),
      fetch(salesUrl, { headers, cache: "no-store" }),
    ]);
    if (!response.ok) {
      console.error("Could not load customer catalog:", await response.text());
      return Response.json({ error: "The drink menu is temporarily unavailable." }, { status: 503 });
    }

    // Best-seller badges: use product_sales view if installed, otherwise fall back to order_items.
    let sales: Array<{ product_id: string; units_sold: number | string }> = [];
    if (salesResponse.ok) {
      sales = await salesResponse.json();
    } else {
      const fallbackSalesUrl = new URL(`${supabaseUrl}/rest/v1/order_items`);
      fallbackSalesUrl.searchParams.set("select", "product_id,quantity,orders!inner(status)");
      fallbackSalesUrl.searchParams.set("orders.status", "neq.cancelled");
      fallbackSalesUrl.searchParams.set("limit", "10000");
      const fallbackResponse = await fetch(fallbackSalesUrl, { headers, cache: "no-store" });
      if (fallbackResponse.ok) {
        const rawItems = await fallbackResponse.json() as Array<{ product_id?: string | null; quantity?: number }>;
        const totals = new Map<string, number>();
        for (const item of rawItems) {
          if (!item.product_id) continue;
          totals.set(item.product_id, (totals.get(item.product_id) ?? 0) + Number(item.quantity ?? 0));
        }
        sales = [...totals.entries()].map(([product_id, units_sold]) => ({ product_id, units_sold }));
      }
    }

    const rows = await response.json() as Array<Record<string, unknown>>;
    const bestSellerRankByProduct = new Map(
      sales
        .map((sale) => [sale.product_id, Number(sale.units_sold)] as const)
        .filter(([, units]) => units > 0)
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
