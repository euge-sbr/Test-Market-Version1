import { randomUUID } from "node:crypto";

import { getAdminSession } from "@/client/auth/admin-auth";
import { getSupabaseServerConfig } from "@/shared/supabase/server";

// Never select "*" here: the shops table also holds admin_password_hash.
const PROFILE_COLUMNS = "name,slug,logo_url,location,promotion,bio";

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

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

async function uploadLogo(file: FormDataEntryValue | null, supabaseUrl: string, key: string) {
  if (!(file instanceof File) || file.size === 0) return undefined;
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  if (!allowedTypes.has(file.type) || file.size > 5_000_000) {
    throw new Error("Choose a JPG, PNG, WebP, or AVIF image under 5 MB.");
  }

  // Reuses the existing public "product-images" bucket, under a logos/ folder.
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `logos/${randomUUID()}.${extension}`;
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
    console.error("Shop logo upload failed:", await response.text());
    throw new Error("Could not upload shop icon.");
  }
  return `${supabaseUrl}/storage/v1/object/public/product-images/${path}`;
}

async function deleteStoredLogo(logoUrl: unknown, supabaseUrl: string, key: string) {
  if (typeof logoUrl !== "string") return;
  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/product-images/`;
  if (!logoUrl.startsWith(publicPrefix)) return;
  const objectPath = logoUrl.slice(publicPrefix.length);
  if (!objectPath) return;

  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/product-images/${objectPath}`, {
      method: "DELETE",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (!response.ok) {
      console.error("Could not delete old shop logo:", await response.text());
    }
  } catch (error) {
    console.error("Could not delete old shop logo:", error);
  }
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return fail("Sign in required.", 401);
  if (session.role !== "shop") return fail("Only shop accounts have a profile.", 403);

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const url = new URL(`${supabaseUrl}/rest/v1/shops`);
    url.searchParams.set("select", PROFILE_COLUMNS);
    url.searchParams.set("id", `eq.${session.shopId}`);
    const response = await fetch(url, { headers: headers(supabaseKey), cache: "no-store" });
    if (!response.ok) {
      console.error("Could not load shop profile:", await response.text());
      return fail("Could not load profile. Make sure the profile columns were added to the shops table.", 502);
    }
    const [profile] = await response.json();
    return profile ? Response.json({ profile }) : fail("Shop not found.", 404);
  } catch (error) {
    console.error("Shop profile is unavailable:", error);
    return fail("Shop profile is unavailable.", 503);
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) return fail("Sign in required.", 401);
  if (session.role !== "shop") return fail("Only shop accounts have a profile.", 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Invalid profile form.", 400);
  }

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const logoUrl = await uploadLogo(form.get("logo"), supabaseUrl, supabaseKey);
    let previousLogoUrl: string | null = null;
    if (logoUrl) {
      try {
        const currentUrl = new URL(`${supabaseUrl}/rest/v1/shops`);
        currentUrl.searchParams.set("select", "logo_url");
        currentUrl.searchParams.set("id", `eq.${session.shopId}`);
        const currentResponse = await fetch(currentUrl, {
          headers: headers(supabaseKey),
          cache: "no-store",
        });
        if (currentResponse.ok) {
          const [currentShop] = (await currentResponse.json()) as Array<{ logo_url?: string | null }>;
          previousLogoUrl = currentShop?.logo_url ?? null;
        }
      } catch (error) {
        console.error("Could not check previous shop logo:", error);
      }
    }

    const updates: Record<string, string> = {
      location: cleanText(form.get("location"), 120),
      promotion: cleanText(form.get("promotion"), 160),
      bio: cleanText(form.get("bio"), 500),
    };
    if (logoUrl) updates.logo_url = logoUrl;

    // The shop always comes from the session, never from the request body.
    const url = new URL(`${supabaseUrl}/rest/v1/shops`);
    url.searchParams.set("id", `eq.${session.shopId}`);
    url.searchParams.set("select", PROFILE_COLUMNS);
    const response = await fetch(url, {
      method: "PATCH",
      headers: headers(supabaseKey, { Prefer: "return=representation" }),
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      console.error("Could not save shop profile:", await response.text());
      return fail("Could not save profile.", 502);
    }
    const [profile] = await response.json();
    if (!profile) return fail("Shop not found.", 404);
    if (logoUrl && previousLogoUrl && previousLogoUrl !== logoUrl) {
      await deleteStoredLogo(previousLogoUrl, supabaseUrl, supabaseKey);
    }
    return Response.json({ profile });
  } catch (error) {
    console.error("Could not save shop profile:", error);
    return fail(error instanceof Error ? error.message : "Could not save profile.", 500);
  }
}
