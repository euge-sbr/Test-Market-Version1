import { createHash } from "node:crypto";

import { getSupabaseServerConfig } from "@/shared/supabase/server";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Returns true when the request is allowed. Counts are stored in Postgres so the
 * limit holds across serverless instances. Fails open if the limiter itself is
 * unavailable (e.g. schema not applied yet) so the store keeps working.
 */
export async function checkRateLimit(scope: string, identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const key = `${scope}:${createHash("sha256").update(identifier).digest("hex").slice(0, 32)}`;
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Rate limiter unavailable:", await response.text());
      return true;
    }
    return (await response.json()) === true;
  } catch (error) {
    console.error("Rate limiter unavailable:", error);
    return true;
  }
}

export function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many attempts. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
