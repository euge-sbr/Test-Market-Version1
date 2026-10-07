"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, LogOut, Plus, ShieldCheck, Store, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

type Shop = {
  id: string;
  name: string;
  slug: string;
  admin_email: string | null;
  is_active: boolean;
  created_at: string;
};

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [shopPassword, setShopPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [updatingShopId, setUpdatingShopId] = useState<string | null>(null);
  const [shopActionError, setShopActionError] = useState("");
  const [shopActionNotice, setShopActionNotice] = useState("");
  const [credentialShopId, setCredentialShopId] = useState<string | null>(null);
  const [newShopPassword, setNewShopPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);

  async function loadShops() {
    const response = await fetch("/api/admin/shops", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load shops.");
    setShops(result.shops as Shop[]);
  }

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const result = await response.json();
        if (response.ok && result.role === "platform") {
          await loadShops();
          if (!cancelled) setIsPlatformAdmin(true);
        } else if (response.ok) {
          if (!cancelled) setError("Shop accounts cannot manage other shops. Sign in with the platform password.");
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load shops.");
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }
    void checkSession();
    return () => { cancelled = true; };
  }, []);

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
    if (result.role !== "platform") {
      setError("Shop accounts cannot manage other shops. Sign in with the platform password.");
      return;
    }
    setPassword("");
    setIsPlatformAdmin(true);
    try {
      await loadShops();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load shops.");
    }
  }

  async function handleCreateShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, email: shopEmail, password: shopPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create shop.");
      setShops((current) => [...current, result.shop as Shop]);
      setName("");
      setSlug("");
      setShopEmail("");
      setShopPassword("");
      setNotice("Shop account created. Share the email and password with its owner.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create shop.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleShop(shop: Shop) {
    if (shop.is_active && !window.confirm(`Disable ${shop.name}? Its products will disappear from the storefront.`)) return;

    setShopActionError("");
    setShopActionNotice("");
    setUpdatingShopId(shop.id);
    try {
      const response = await fetch("/api/admin/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shop.id, is_active: !shop.is_active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update shop status.");
      setShops((current) => current.map((item) => item.id === shop.id ? result.shop as Shop : item));
      setShopActionNotice(`${shop.name} is now ${result.shop.is_active ? "enabled" : "disabled"}.`);
    } catch (reason) {
      setShopActionError(reason instanceof Error ? reason.message : "Could not update shop status.");
    } finally {
      setUpdatingShopId(null);
    }
  }

  async function handleResetPassword(shop: Shop, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShopActionError("");
    setShopActionNotice("");
    setIsSavingPassword(true);
    try {
      const response = await fetch("/api/admin/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shop.id, password: newShopPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update shop password.");
      setShopActionNotice(`Password updated for ${shop.name}. The new password remains visible until you close this panel.`);
    } catch (reason) {
      setShopActionError(reason instanceof Error ? reason.message : "Could not update shop password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleDeleteShop(shop: Shop) {
    if (!window.confirm(`Permanently delete ${shop.name}? This removes its products, all orders, and order items. This cannot be undone.`)) return;

    setShopActionError("");
    setShopActionNotice("");
    setDeletingShopId(shop.id);
    try {
      const response = await fetch(`/api/admin/shops?id=${encodeURIComponent(shop.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete shop.");
      setShops((current) => current.filter((item) => item.id !== shop.id));
      if (credentialShopId === shop.id) {
        setCredentialShopId(null);
        setNewShopPassword("");
      }
      setShopActionNotice(`${shop.name} and its shop data were deleted.`);
    } catch (reason) {
      setShopActionError(reason instanceof Error ? reason.message : "Could not delete shop.");
    } finally {
      setDeletingShopId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setIsPlatformAdmin(false);
    setShops([]);
  }

  if (isChecking) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">Checking platform access...</main>;
  }

  if (!isPlatformAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
        <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"><ShieldCheck className="size-5" aria-hidden="true" /></div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Pearl &amp; Pour / Platform</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">Manage shops</h1>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Client email <span className="font-normal text-zinc-500">(leave blank for platform access)</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" /></label>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password<div className="relative mt-2"><KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" /><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" /></div></label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800">Sign in</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-emerald-700 text-white"><Store className="size-5" aria-hidden="true" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Pearl &amp; Pour / Platform</p><h1 className="text-lg font-semibold">Client shops</h1></div></div>
          <div className="flex items-center gap-2">
            <nav aria-label="Admin sections" className="flex items-center gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
              <a href="/admin/orders" className="rounded px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">Orders</a>
              <a href="/admin/products" className="rounded px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">Products</a>
              <a href="/admin/clients" aria-current="page" className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white">Clients</a>
            </nav>
            <button type="button" onClick={() => void handleLogout()} title="Sign out" aria-label="Sign out" className="flex size-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><LogOut className="size-4" aria-hidden="true" /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:px-8">
        <section className="h-fit rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3"><Plus className="size-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" /><div><h2 className="font-semibold">Add a client shop</h2><p className="mt-1 text-sm text-zinc-500">Their available products join the customer storefront.</p></div></div>
          <form onSubmit={handleCreateShop} className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Shop name<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" placeholder="Harbor Tea" /></label>
            <label className="block text-sm font-medium">Shop identifier<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={48} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" placeholder="harbor-tea" /></label>
            <label className="block text-sm font-medium">Client login email<input required type="email" autoComplete="off" value={shopEmail} onChange={(event) => setShopEmail(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" /></label>
            <label className="block text-sm font-medium">Temporary password<input required type="password" minLength={12} autoComplete="new-password" value={shopPassword} onChange={(event) => setShopPassword(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" /></label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
            <button type="submit" disabled={isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Plus className="size-4" aria-hidden="true" />{isSaving ? "Creating..." : "Create shop"}</button>
          </form>
        </section>

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-5 dark:border-zinc-800"><h2 className="font-semibold">Shops</h2><p className="mt-1 text-sm text-zinc-500">{shops.length} client account{shops.length === 1 ? "" : "s"}</p></div>
          {shopActionError && <p role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{shopActionError}</p>}
          {shopActionNotice && <p role="status" className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">{shopActionNotice}</p>}
          {shops.length === 0 ? <p className="p-6 text-sm text-zinc-500">No shops found.</p> : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {shops.map((shop) => (
                <li key={shop.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-medium">{shop.name}</p><p className="mt-1 text-sm text-zinc-500">{shop.admin_email ?? "Platform account"}</p></div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-1 text-xs font-medium ${shop.is_active ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>{shop.is_active ? "Enabled" : "Disabled"}</span>
                      <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{shop.slug}</span>
                      {shop.admin_email && <button type="button" onClick={() => { setCredentialShopId(credentialShopId === shop.id ? null : shop.id); setNewShopPassword(""); setShopActionError(""); setShopActionNotice(""); }} aria-expanded={credentialShopId === shop.id} className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><KeyRound className="size-4" aria-hidden="true" />Credentials</button>}
                      <button type="button" onClick={() => void handleToggleShop(shop)} disabled={updatingShopId === shop.id} aria-label={`${shop.is_active ? "Disable" : "Enable"} ${shop.name}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                        {shop.is_active ? <ToggleRight className="size-4 text-emerald-700" aria-hidden="true" /> : <ToggleLeft className="size-4" aria-hidden="true" />}
                        {updatingShopId === shop.id ? "Saving..." : shop.is_active ? "Disable" : "Enable"}
                      </button>
                      {shop.admin_email && <button type="button" onClick={() => void handleDeleteShop(shop)} disabled={deletingShopId === shop.id} aria-label={`Delete ${shop.name}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"><Trash2 className="size-4" aria-hidden="true" />{deletingShopId === shop.id ? "Deleting..." : "Delete"}</button>}
                    </div>
                  </div>
                  {credentialShopId === shop.id && <form onSubmit={(event) => void handleResetPassword(shop, event)} className="mt-4 grid gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-medium">Login email:</span> {shop.admin_email ?? "Not set"}</p>
                      <p className="text-xs text-zinc-500">The current password is stored securely and cannot be viewed. Set a new temporary password below.</p>
                      <label className="block text-sm font-medium">New password<input type="text" required minLength={12} maxLength={128} autoComplete="new-password" value={newShopPassword} onChange={(event) => setNewShopPassword(event.target.value)} className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" /></label>
                    </div>
                    <button type="submit" disabled={isSavingPassword || newShopPassword.length < 12} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><KeyRound className="size-4" aria-hidden="true" />{isSavingPassword ? "Saving..." : "Set password"}</button>
                  </form>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}