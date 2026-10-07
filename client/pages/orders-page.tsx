"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound, LogOut, PackageCheck, RefreshCw, Search, ShieldCheck } from "lucide-react";

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number | string;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postal_code: string;
  delivery_note: string | null;
  payment_method: string;
  total: number | string;
  status: string;
  created_at: string;
  items: OrderItem[];
};

const statuses = ["pending", "confirmed", "preparing", "delivered", "cancelled"];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

async function fetchOrders(): Promise<Order[]> {
  const response = await fetch("/api/admin/orders", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error ?? "Could not load orders."), { status: response.status });
  return result.orders as Order[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    void fetchOrders()
      .then(async (data) => {
        setOrders(data);
        setIsAuthenticated(true);
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (response.ok) {
          const session = await response.json();
          setIsPlatformAdmin(session.role === "platform");
        }
      })
      .catch((reason: Error & { status?: number }) => {
        if (reason.status !== 401) setError(reason.message);
      })
      .finally(() => setIsChecking(false));
  }, []);

  const refreshOrders = useCallback(async () => {
    setIsRefreshing(true);
    setError("");
    try {
      setOrders(await fetchOrders());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load orders.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = new EventSource("/api/admin/orders/events");
    events.addEventListener("ready", () => {
      setIsRealtimeConnected(true);
      void refreshOrders();
    });
    events.addEventListener("change", () => void refreshOrders());
    events.addEventListener("stream-error", () => setIsRealtimeConnected(false));
    events.onerror = () => setIsRealtimeConnected(false);

    return () => events.close();
  }, [isAuthenticated, refreshOrders]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not sign in.");
      return;
    }

    setPassword("");
    setEmail("");
    setIsPlatformAdmin(result.role === "platform");
    setIsAuthenticated(true);
    await refreshOrders();
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setOrders([]);
    setIsAuthenticated(false);
    setIsPlatformAdmin(false);
    setIsRealtimeConnected(false);
  }

  async function updateStatus(orderId: string, status: string) {
    setError("");
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not update status.");
      return;
    }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOrders = orders.filter((order) =>
    [order.order_number, order.customer_name, order.customer_email, order.status]
      .some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
  const pendingCount = orders.filter((order) => order.status === "pending").length;
  const grossTotal = orders.reduce((sum, order) => sum + Number(order.total), 0);

  if (isChecking) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">Checking admin access...</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
        <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"><ShieldCheck className="size-5" aria-hidden="true" /></div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Pearl & Pour / Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">Orders dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to view customer orders.</p>
          <form onSubmit={handleLogin} className="mt-6">
            <label htmlFor="admin-email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Client email <span className="font-normal text-zinc-500">(leave blank for platform access)</span></label>
            <div className="relative mt-2"><input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" /></div>
            <label htmlFor="admin-password" className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
            <div className="relative mt-2">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <button type="submit" className="mt-5 w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">Sign in</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-emerald-700 text-white"><PackageCheck className="size-5" aria-hidden="true" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Pearl & Pour</p><h1 className="text-lg font-semibold">Orders</h1></div></div>
          <div className="flex items-center gap-2">
            <nav aria-label="Admin sections" className="mr-2 flex items-center gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
              <a href="/admin/orders" aria-current="page" className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white">Orders</a>
              <a href="/admin/products" className="rounded px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">Products</a>
              {isPlatformAdmin && <a href="/admin/clients" className="rounded px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">Clients</a>}
            </nav>
            <span role="status" className="flex items-center gap-1.5 text-xs text-zinc-500"><span className={`size-2 rounded-full ${isRealtimeConnected ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`} /><span className="hidden sm:inline">{isRealtimeConnected ? "Live" : "Connecting"}</span></span>
            <button type="button" onClick={() => void refreshOrders()} disabled={isRefreshing} title="Refresh orders" aria-label="Refresh orders" className="flex size-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} /></button>
            <button type="button" onClick={() => void handleLogout()} className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><LogOut className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Orders loaded</p><p className="mt-2 text-3xl font-semibold">{orders.length}</p><p className="mt-1 text-xs text-zinc-500">Most recent 200</p></section>
          <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Needs attention</p><p className="mt-2 text-3xl font-semibold">{pendingCount}</p><p className="mt-1 text-xs text-zinc-500">Pending orders</p></section>
          <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Gross order value</p><p className="mt-2 text-3xl font-semibold">{currency.format(grossTotal)}</p><p className="mt-1 text-xs text-zinc-500">Across orders loaded</p></section>
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div><h2 className="font-semibold">Customer orders</h2><p className="mt-1 text-sm text-zinc-500">Review delivery details and update order status.</p></div>
            <label className="relative block sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order or customer" className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 dark:border-zinc-700 dark:bg-zinc-950" /></label>
          </div>
          {error && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          {visibleOrders.length === 0 ? (
            <div className="px-6 py-16 text-center"><PackageCheck className="mx-auto size-8 text-zinc-400" aria-hidden="true" /><p className="mt-3 font-medium">{orders.length === 0 ? "No orders yet" : "No matching orders"}</p><p className="mt-1 text-sm text-zinc-500">{orders.length === 0 ? "New customer orders will appear here." : "Try another order number, name, or email."}</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60"><tr><th className="px-4 py-3 font-medium">Order / items</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Placed</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {visibleOrders.map((order) => (
                    <FragmentRow key={order.id} order={order} expanded={expandedOrder === order.id} onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} onStatusChange={(status) => void updateStatus(order.id, status)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FragmentRow({ order, expanded, onToggle, onStatusChange }: { order: Order; expanded: boolean; onToggle: () => void; onStatusChange: (status: string) => void }) {
  const itemSummary = order.items.map((item) => `${item.quantity} × ${item.product_name}`).join(", ");

  return <>
    <tr className="align-middle">
      <td className="max-w-64 px-4 py-4">
        <p className="whitespace-nowrap font-semibold">{order.order_number}</p>
        <p className="mt-1 max-w-56 truncate text-xs font-normal text-zinc-500" title={itemSummary}>{itemSummary || "No item details"}</p>
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="mt-1 rounded py-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">{expanded ? "Hide details" : "View details"}</button>
      </td>
      <td className="px-4 py-4"><p className="font-medium">{order.customer_name}</p><p className="mt-0.5 text-xs text-zinc-500">{order.customer_email}</p></td>
      <td className="whitespace-nowrap px-4 py-4 text-zinc-600 dark:text-zinc-400">{new Date(order.created_at).toLocaleString()}</td>
      <td className="whitespace-nowrap px-4 py-4 font-medium">{currency.format(Number(order.total))}</td>
      <td className="px-4 py-4"><select aria-label={`Status for ${order.order_number}`} value={order.status} onChange={(event) => onStatusChange(event.target.value)} className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs capitalize dark:border-zinc-700 dark:bg-zinc-950">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></td>
    </tr>
    {expanded && <tr><td colSpan={5} className="bg-zinc-50 px-4 py-5 dark:bg-zinc-950/50"><div className="grid gap-6 md:grid-cols-2"><div><h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Delivery</h3><p className="mt-2 font-medium">{order.customer_name}</p><p className="text-sm text-zinc-600 dark:text-zinc-400">{order.delivery_address}, {order.delivery_city} {order.delivery_postal_code}</p><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{order.customer_phone}</p>{order.delivery_note && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Note: {order.delivery_note}</p>}<p className="mt-2 text-xs capitalize text-zinc-500">Payment: {order.payment_method}</p></div><div><h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Items</h3><ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-3 py-2 text-sm"><span>{item.quantity} × {item.product_name}</span><span className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">{currency.format(Number(item.unit_price) * item.quantity)}</span></li>)}</ul></div></div></td></tr>}
  </>;
}
