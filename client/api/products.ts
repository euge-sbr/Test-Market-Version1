import { randomUUID } from "node:crypto";

import { getAdminSession } from "@/client/auth/admin-auth";
import { getSupabaseServerConfig } from "@/shared/supabase/server";

type ProductInput = {
  id?: string;
  shop_id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  is_available: boolean;
  image_url?: string | null;
};

function headers(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function validateProduct(form: FormData, id?: string): ProductInput | null {
  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const price = Number(form.get("price"));
  if (!name || !category || !Number.isFinite(price) || price < 0) return null;

  const imageUrl = form.get("image_url");
  return {
    ...(id ? { id } : {}),
    name,
    category,
    description: String(form.get("description") ?? "").trim(),
    price,
    is_available: form.get("is_available") === "true",
    ...(typeof imageUrl === "string" && imageUrl ? { image_url: imageUrl } : {}),
  };
}

async function uploadProductImage(file: FormDataEntryValue | null, supabaseUrl: string, key: string) {
  if (!(file instanceof File) || file.size === 0) return undefined;
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  if (!allowedTypes.has(file.type) || file.size > 5_000_000) {
    throw new Error("Choose a JPG, PNG, WebP, or AVIF image under 5 MB.");
  }

  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${randomUUID()}.${extension}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/product-images/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: file,
  });
  if (!response.ok) {
    console.error("Product image upload failed:", await response.text());
    throw new Error("Could not upload product image.");
  }
  return `${supabaseUrl}/storage/v1/object/public/product-images/${path}`;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return fail("Sign in required.", 401);

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const url = new URL(`${supabaseUrl}/rest/v1/products`);
    url.searchParams.set("select", "*");
    url.searchParams.set("shop_id", `eq.${session.shopId}`);
    url.searchParams.set("order", "created_at.desc");
    const response = await fetch(url, {
      headers: headers(supabaseKey),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Could not load products:", await response.text());
      return fail("Could not load products. Apply the products schema in Supabase first.", 502);
    }
    return Response.json({ products: await response.json() });
  } catch (error) {
    console.error("Product catalog is unavailable:", error);
    return fail("Product catalog is unavailable.", 503);
  }
}

async function saveProduct(form: FormData, existingId?: string) {
  const session = await getAdminSession();
  if (!session) return fail("Sign in required.", 401);

  try {
    const id = existingId ?? randomUUID();
    const product = validateProduct(form, id);
    if (!product) return fail("Enter a product name, category, and valid non-negative price.", 400);
    product.shop_id = session.shopId;

    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const imageUrl = await uploadProductImage(form.get("image"), supabaseUrl, supabaseKey);
    if (imageUrl) product.image_url = imageUrl;

    const url = new URL(`${supabaseUrl}/rest/v1/products`);
    const method = existingId ? "PATCH" : "POST";
    if (existingId) {
      url.searchParams.set("id", `eq.${existingId}`);
      url.searchParams.set("shop_id", `eq.${session.shopId}`);
    }
    const body = existingId
      ? { ...product, updated_at: new Date().toISOString() }
      : product;
    const response = await fetch(url, {
      method,
      headers: headers(supabaseKey, { Prefer: "return=representation" }),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error("Could not save product:", await response.text());
      return fail("Could not save product.", 502);
    }
    const [savedProduct] = await response.json();
    if (!savedProduct) return fail("Product not found.", 404);
    return Response.json({ product: savedProduct }, { status: existingId ? 200 : 201 });
  } catch (error) {
    console.error("Could not save product:", error);
    return fail(error instanceof Error ? error.message : "Could not save product.", 500);
  }
}

export async function POST(request: Request) {
  try {
    return saveProduct(await request.formData());
  } catch {
    return fail("Invalid product form.", 400);
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) return fail("Sign in required.", 401);

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      const body = (await request.json()) as { id?: unknown; is_available?: unknown };
      if (typeof body.id !== "string" || !body.id || typeof body.is_available !== "boolean") {
        return fail("Invalid product availability update.", 400);
      }
      const url = new URL(`${supabaseUrl}/rest/v1/products`);
      url.searchParams.set("id", `eq.${body.id}`);
      url.searchParams.set("shop_id", `eq.${session.shopId}`);
      const response = await fetch(url, {
        method: "PATCH",
        headers: headers(supabaseKey, { Prefer: "return=representation" }),
        body: JSON.stringify({ is_available: body.is_available, updated_at: new Date().toISOString() }),
      });
      if (!response.ok) return fail("Could not update availability.", 502);
      const [product] = await response.json();
      return product ? Response.json({ product }) : fail("Product not found.", 404);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail("Invalid product form.", 400);
    }
    const id = String(form.get("id") ?? "");
    return id ? saveProduct(form, id) : fail("Product ID is required.", 400);
  } catch (error) {
    console.error("Could not update product:", error);
    return fail("Could not update product.", 500);
  }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) return fail("Sign in required.", 401);

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Product ID is required.", 400);

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const url = new URL(`${supabaseUrl}/rest/v1/products`);
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("shop_id", `eq.${session.shopId}`);
    url.searchParams.set("select", "id");
    const response = await fetch(url, {
      method: "DELETE",
      headers: headers(supabaseKey, { Prefer: "return=representation" }),
    });
    if (!response.ok) return fail("Could not delete product.", 502);
    const deleted = await response.json();
    return deleted.length ? Response.json({ deleted: true }) : fail("Product not found.", 404);
  } catch (error) {
    console.error("Could not delete product:", error);
    return fail("Product catalog is unavailable.", 503);
  }
}
