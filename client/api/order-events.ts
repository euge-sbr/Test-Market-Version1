import { createClient } from "@supabase/supabase-js";

import { getAdminSession } from "@/client/auth/admin-auth";
import { getSupabaseServerConfig } from "@/shared/supabase/server";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  let supabaseUrl: string;
  let supabaseKey: string;
  try {
    ({ supabaseUrl, supabaseKey } = getSupabaseServerConfig());
  } catch {
    return Response.json({ error: "Realtime is not configured." }, { status: 503 });
  }

  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const encoder = new TextEncoder();
      let closed = false;

      const send = (event: string, data: object) => {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const heartbeat = setInterval(() => send("ping", {}), 25_000);
      const channel = supabase
        .channel(`admin-orders-${session.shopId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `shop_id=eq.${session.shopId}` }, () => send("change", { table: "orders" }))
        .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => send("change", { table: "order_items" }));
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        void supabase.removeChannel(channel);
      };

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") send("ready", {});
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          send("stream-error", {});
          cleanup();
          controller.close();
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}