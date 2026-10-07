import { randomUUID } from "node:crypto";

import { DEFAULT_SHOP_ID, getAdminSession, hashShopPassword } from "@/client/auth/admin-auth";
import { getSupabaseServerConfig } from "@/shared/supabase/server";

function headers(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (session.role !== "platform") return Response.json({ error: "Platform access required." }, { status: 403 });

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const url = new URL(`${supabaseUrl}/rest/v1/shops`);
    url.searchParams.set("select", "id,name,slug,admin_email,created_at,is_active");
    url.searchParams.set("order", "created_at.asc");
    const response = await fetch(url, { headers: headers(supabaseKey), cache: "no-store" });
    if (!response.ok) {
      console.error("Could not load shops:", await response.text());
      return Response.json({ error: "Could not load shops." }, { status: 502 });
    }
    return Response.json({ shops: await response.json() });
  } catch (error) {
    console.error("Shop directory is unavailable:", error);
    return Response.json({ error: "Shop directory is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || session.role !== "platform") {
    return Response.json({ error: "Platform access required." }, { status: 403 });
  }

  let body: { name?: unknown; slug?: unknown; email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (
    name.length < 2 || name.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 48 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 12 || password.length > 128
  ) {
    return Response.json({ error: "Enter a shop name, valid URL slug and email, and a password of at least 12 characters." }, { status: 400 });
  }

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const url = new URL(`${supabaseUrl}/rest/v1/shops`);
    url.searchParams.set("select", "id,name,slug,admin_email,created_at,is_active");
    const response = await fetch(url, {
      method: "POST",
      headers: headers(supabaseKey, { Prefer: "return=representation" }),
      body: JSON.stringify({
        id: randomUUID(),
        name,
        slug,
        admin_email: email,
        admin_password_hash: await hashShopPassword(password),
      }),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error("Could not create shop:", details);
      return Response.json({ error: response.status === 409 ? "That shop slug or email is already in use." : "Could not create shop." }, { status: response.status === 409 ? 409 : 502 });
    }
    const [shop] = await response.json();
    return Response.json({ shop }, { status: 201 });
  } catch (error) {
    console.error("Could not create shop:", error);
    return Response.json({ error: "Shop directory is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session || session.role !== "platform") {
    return Response.json({ error: "Platform access required." }, { status: 403 });
  }

  let body: { id?: unknown; is_active?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const hasStatus = typeof body.is_active === "boolean";
  const hasPassword = typeof body.password === "string";
  if (
    typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || hasStatus === hasPassword ||
    (hasPassword && ((body.password as string).length < 12 || (body.password as string).length > 128))
  ) {
    return Response.json({ error: "Enter a valid shop ID and either a status or a password of at least 12 characters." }, { status: 400 });
  }

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const url = new URL(`${supabaseUrl}/rest/v1/shops`);
    url.searchParams.set("id", `eq.${body.id}`);
    url.searchParams.set("select", "id,name,slug,admin_email,created_at,is_active");
    const response = await fetch(url, {
      method: "PATCH",
      headers: headers(supabaseKey, { Prefer: "return=representation" }),
      body: JSON.stringify(hasStatus
        ? { is_active: body.is_active }
        : { admin_password_hash: await hashShopPassword(body.password as string) }),
    });
    if (!response.ok) {
      console.error("Could not update shop status:", await response.text());
      return Response.json({ error: "Could not update shop status." }, { status: 502 });
    }
    const [shop] = await response.json();
    return shop ? Response.json({ shop }) : Response.json({ error: "Shop not found." }, { status: 404 });
  } catch (error) {
    console.error("Could not update shop status:", error);
    return Response.json({ error: "Shop directory is unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session || session.role !== "platform") {
    return Response.json({ error: "Platform access required." }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id) || id.toLowerCase() === DEFAULT_SHOP_ID) {
    return Response.json({ error: "Invalid shop. The platform shop cannot be deleted." }, { status: 400 });
  }

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_shop_and_data`, {
      method: "POST",
      headers: headers(supabaseKey),
      body: JSON.stringify({ target_shop_id: id }),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error("Could not delete shop and its data:", details);
      let databaseMessage = "";
      try {
        const parsed = JSON.parse(details) as { message?: unknown; details?: unknown };
        databaseMessage = [parsed.message, parsed.details]
          .filter((value): value is string => typeof value === "string")
          .join(" ");
      } catch {
        databaseMessage = "";
      }
      return Response.json({
        error: `Could not delete the client and its data.${databaseMessage ? ` ${databaseMessage}` : ""}`,
      }, { status: 502 });
    }
    const deleted = await response.json() as boolean;
    return deleted ? Response.json({ deleted: true }) : Response.json({ error: "Shop not found." }, { status: 404 });
  } catch (error) {
    console.error("Could not delete shop:", error);
    return Response.json({ error: "Shop directory is unavailable." }, { status: 503 });
  }
}