import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  DEFAULT_SHOP_ID,
  getAdminSession,
  verifyAdminPassword,
  verifyShopPassword,
} from "@/client/auth/admin-auth";
import { getSupabaseServerConfig } from "@/shared/supabase/server";

const cookieOptions = {
  httpOnly: true,
  maxAge: ADMIN_SESSION_MAX_AGE,
  path: "/",
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "Admin access is not configured." }, { status: 503 });
  }

  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof password !== "string" || !password || password.length > 128) {
    return Response.json({ error: "Enter your email and password." }, { status: 400 });
  }

  let shopId = DEFAULT_SHOP_ID;
  let role: "platform" | "shop" = "platform";

  if (typeof email === "string" && email.trim()) {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
      const shopsUrl = new URL(`${supabaseUrl}/rest/v1/shops`);
      shopsUrl.searchParams.set("select", "id,admin_password_hash,is_active");
      shopsUrl.searchParams.set("admin_email", `eq.${email.trim().toLowerCase()}`);
      const response = await fetch(shopsUrl, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        cache: "no-store",
      });
      if (!response.ok) {
        console.error("Could not check shop credentials:", await response.text());
        return Response.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
      }

      const [shop] = await response.json() as Array<{ id: string; admin_password_hash: string | null; is_active: boolean }>;
      if (!shop?.admin_password_hash || !(await verifyShopPassword(password, shop.admin_password_hash))) {
        return Response.json({ error: "Incorrect email or password." }, { status: 401 });
      }
      if (!shop.is_active) {
        return Response.json({ error: "This shop is disabled. Contact the platform administrator." }, { status: 403 });
      }
      shopId = shop.id;
      role = "shop";
    } catch (error) {
      console.error("Shop sign-in is unavailable:", error);
      return Response.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
    }
  } else if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSession(shopId, role), cookieOptions);
  return Response.json({ authenticated: true, role, shopId });
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: true, role: session.role, shopId: session.shopId });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return Response.json({ authenticated: false });
}
