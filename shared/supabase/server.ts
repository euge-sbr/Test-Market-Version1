export function getSupabaseServerConfig() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!configuredUrl || !supabaseKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  const supabaseUrl = configuredUrl.replace(/\/rest\/v1\/?$/, "");
  return { supabaseUrl, supabaseKey };
}
