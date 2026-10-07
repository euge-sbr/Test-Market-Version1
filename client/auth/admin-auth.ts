import { cookies } from "next/headers";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { getSupabaseServerConfig } from "@/shared/supabase/server";

export const ADMIN_SESSION_COOKIE = "pearlpour_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;
export const DEFAULT_SHOP_ID = "00000000-0000-4000-8000-000000000001";

export type AdminSession = {
  expiresAt: number;
  shopId: string;
  role: "platform" | "shop";
};

function createSignature(payload: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Admin session signing is not configured.");

  return createHmac("sha256", secret)
    .update(`admin-session:${payload}`)
    .digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;

  const submittedHash = createHmac("sha256", "admin-password-check").update(password).digest();
  const configuredHash = createHmac("sha256", "admin-password-check").update(configuredPassword).digest();
  return timingSafeEqual(submittedHash, configuredHash);
}

export function hashShopPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export function verifyShopPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash, extra] = storedHash.split(":");
  if (!salt || !hash || extra || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return Promise.resolve(false);

  const configuredHash = Buffer.from(hash, "hex");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, submittedHash) => {
      if (error) return reject(error);
      resolve(timingSafeEqual(submittedHash, configuredHash));
    });
  });
}

export function createAdminSession(shopId: string, role: AdminSession["role"]): string {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE,
    shopId,
    role,
  })).toString("base64url");
  return `${payload}.${createSignature(payload)}`;
}

export function parseAdminSession(value: string | undefined): AdminSession | null {
  if (!value) return null;

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;

  try {
    const expected = Buffer.from(createSignature(payload), "hex");
    const supplied = Buffer.from(signature, "hex");
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) return null;

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AdminSession>;
    if (
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Math.floor(Date.now() / 1000) ||
      typeof session.shopId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(session.shopId) ||
      (session.role !== "platform" && session.role !== "shop")
    ) return null;

    return session as AdminSession;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const session = parseAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return null;
  if (session.role === "shop" && !(await isShopActive(session.shopId))) return null;
  return session;
}

export async function isShopActive(shopId: string): Promise<boolean> {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const url = new URL(`${supabaseUrl}/rest/v1/shops`);
    url.searchParams.set("select", "id");
    url.searchParams.set("id", `eq.${shopId}`);
    url.searchParams.set("is_active", "eq.true");
    const response = await fetch(url, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: "no-store",
    });
    return response.ok && (await response.json()).length > 0;
  } catch {
    return false;
  }
}
