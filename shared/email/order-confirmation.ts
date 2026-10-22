// Order confirmation emails via Resend's REST API. Skipped (with a log) when not configured.

type ConfirmationOrder = {
  orderNumber: string;
  shopName: string;
  trackingUrl: string;
  total: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendOrderConfirmationEmail(options: {
  to: string;
  customerName: string;
  paymentMethod: "card" | "cash";
  orders: ConfirmationOrder[];
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("Order confirmation email skipped: RESEND_API_KEY / EMAIL_FROM not set.");
    return;
  }

  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: (process.env.STRIPE_CURRENCY ?? "usd").toUpperCase() });
  const paymentNote = options.paymentMethod === "card"
    ? "Your order will be sent to the shop as soon as your card payment is confirmed."
    : "Please have cash ready when your order arrives.";
  const rows = options.orders.map((order) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e4e4e7">
        <strong>${escapeHtml(order.shopName)}</strong><br>
        <span style="color:#71717a;font-size:13px">Order ${escapeHtml(order.orderNumber)} · ${currency.format(order.total)}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;text-align:right">
        <a href="${escapeHtml(order.trackingUrl)}" style="background:#4f46e5;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:14px">Track order</a>
      </td>
    </tr>`).join("");

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#18181b">
      <h1 style="font-size:22px">Thanks for your order, ${escapeHtml(options.customerName)}!</h1>
      <p style="color:#52525b">${paymentNote}</p>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <p style="color:#71717a;font-size:13px;margin-top:24px">Keep this email: the tracking links are private and are the only way to check your order status.</p>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.orders.length === 1
        ? `Your order ${options.orders[0].orderNumber}`
        : `Your ${options.orders.length} orders`,
      html,
    }),
  });
  if (!response.ok) {
    console.error("Order confirmation email failed:", response.status, await response.text());
  }
}
