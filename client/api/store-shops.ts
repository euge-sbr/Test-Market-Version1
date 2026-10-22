import { getSupabaseServerConfig } from "@/shared/supabase/server";

// Public columns only. Never expose admin_email or admin_password_hash here.
const PUBLIC_COLUMNS = "id,name,slug,logo_url,location,promotion,bio";

export async function GET() {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();
    const url = new URL(`${supabaseUrl}/rest/v1/shops`);
    url.searchParams.set("select", PUBLIC_COLUMNS);
    url.searchParams.set("is_active", "eq.true");
    url.searchParams.set("order", "name.asc");

    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      // Always read the latest profile so logo and bio edits show up right away.
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Could not load shop profiles:", await response.text());
      return Response.json({ error: "Shop profiles are temporarily unavailable." }, { status: 503 });
    }

    return Response.json({ shops: await response.json() });
  } catch (error) {
    console.error("Shop profiles are unavailable:", error);
    return Response.json({ error: "Shop profiles are temporarily unavailable." }, { status: 503 });
  }
}
