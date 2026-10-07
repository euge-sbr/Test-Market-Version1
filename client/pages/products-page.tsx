"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { PRODUCT_CATEGORIES } from "@/customers/data/product-categories";
import {
  ImagePlus,
  KeyRound,
  LoaderCircle,
  LogOut,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  X,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number | string;
  image_url: string | null;
  rating: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/api/admin/products", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(result.error ?? "Could not load products."), { status: response.status });
  }
  return result.products as Product[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const refreshProducts = useCallback(async () => {
    setIsRefreshing(true);
    setError("");
    try {
      setProducts(await fetchProducts());
      setIsAuthenticated(true);
      const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" });
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        setIsPlatformAdmin(session.role === "platform");
      }
    } catch (reason) {
      const failure = reason as Error & { status?: number };
      if (failure.status === 401) {
        setError("");
        setIsAuthenticated(false);
      } else {
        setError(failure.message);
        setIsAuthenticated(true);
      }
    } finally {
      setIsRefreshing(false);
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshProducts(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshProducts]);

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
    await refreshProducts();
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setProducts([]);
    setIsAuthenticated(false);
    setIsPlatformAdmin(false);
  }

  async function handleAvailability(product: Product) {
    const nextAvailability = !product.is_available;
    setIsSavingAvailability(product.id);
    setError("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, is_available: nextAvailability }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update availability.");
      setProducts((current) => current.map((item) => item.id === product.id ? result.product as Product : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update availability.");
    } finally {
      setIsSavingAvailability(null);
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete product.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete product.");
    }
  }

  function openNewProduct() {
    setEditingProduct(null);
    setIsFormOpen(true);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleProducts = products.filter((product) =>
    [product.name, product.category, product.description]
      .some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
  const outOfStockCount = products.filter((product) => !product.is_available).length;
  const activeCount = products.filter((product) => product.is_available).length;

  if (isChecking) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">Checking admin access...</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
        <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"><ShieldCheck className="size-5" aria-hidden="true" /></div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Pearl &amp; Pour / Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">Products dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to manage the product catalog.</p>
          <form onSubmit={handleLogin} className="mt-6">
            <label htmlFor="products-admin-email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Client email <span className="font-normal text-zinc-500">(leave blank for platform access)</span></label>
            <div className="mt-2"><input id="products-admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" /></div>
            <label htmlFor="products-admin-password" className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
            <div className="relative mt-2">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input id="products-admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-emerald-700 text-white"><Package className="size-5" aria-hidden="true" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Pearl &amp; Pour</p><h1 className="text-lg font-semibold">Products</h1></div></div>
          <div className="flex items-center gap-2">
            <nav aria-label="Admin sections" className="mr-2 flex items-center gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
              <a href="/admin/orders" className="rounded px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">Orders</a>
              <a href="/admin/products" aria-current="page" className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white">Products</a>
              {isPlatformAdmin && <a href="/admin/clients" className="rounded px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">Clients</a>}
            </nav>
            <button type="button" onClick={() => void refreshProducts()} disabled={isRefreshing} title="Refresh products" aria-label="Refresh products" className="flex size-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} /></button>
            <button type="button" onClick={() => void handleLogout()} className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><LogOut className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Catalog</p><h2 className="mt-1 text-2xl font-semibold">Product management</h2></div>
          <button type="button" onClick={openNewProduct} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"><Plus className="size-4" aria-hidden="true" />Add product</button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Products" value={products.length} note="In your catalog" icon={Package} />
          <SummaryCard label="Out of Stock" value={outOfStockCount} note="Items needing restock" icon={PackageCheck} accent="amber" />
          <SummaryCard label="Active on Store" value={activeCount} note="Published products" icon={Store} accent="emerald" />
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div><h2 className="font-semibold">Product catalog</h2><p className="mt-1 text-sm text-zinc-500">Edit listing details and store availability.</p></div>
            <label className="relative block sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 dark:border-zinc-700 dark:bg-zinc-950" /></label>
          </div>
          {error && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          {products.length === 0 ? (
            <div className="px-6 py-16 text-center"><Package className="mx-auto size-8 text-zinc-400" aria-hidden="true" /><p className="mt-3 font-medium">No products yet</p><p className="mt-1 text-sm text-zinc-500">Add a product to start building your catalog.</p></div>
          ) : visibleProducts.length === 0 ? (
            <div className="px-6 py-16 text-center"><Search className="mx-auto size-8 text-zinc-400" aria-hidden="true" /><p className="mt-3 font-medium">No matching products</p><p className="mt-1 text-sm text-zinc-500">Try another name or category.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-210 text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60"><tr><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Price</th><th className="px-4 py-3 font-medium">Availability</th><th className="px-4 py-3 font-medium">Updated</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {visibleProducts.map((product) => (
                    <tr key={product.id} className="align-middle">
                      <td className="px-4 py-3"><div className="flex min-w-56 items-center gap-3"><ProductThumbnail product={product} /><div className="min-w-0"><p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{product.name}</p><p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{product.description || "No description"}</p></div></div></td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">{product.category}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{currency.format(Number(product.price))}</td>
                      <td className="whitespace-nowrap px-4 py-3"><div className="flex items-center gap-3"><button type="button" role="switch" aria-checked={product.is_available} aria-label={`${product.is_available ? "Mark" : "Set"} ${product.name} ${product.is_available ? "out of stock" : "available"}`} disabled={isSavingAvailability === product.id} onClick={() => void handleAvailability(product)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50 ${product.is_available ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"}`}><span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${product.is_available ? "translate-x-6" : "translate-x-1"}`} /></button><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.is_available ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"}`}>{product.is_available ? "Active" : "Out of stock"}</span></div></td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">{new Date(product.updated_at || product.created_at).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => { setEditingProduct(product); setIsFormOpen(true); }} title={`Edit ${product.name}`} aria-label={`Edit ${product.name}`} className="flex size-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"><Pencil className="size-4" aria-hidden="true" /></button><button type="button" onClick={() => void handleDelete(product)} title={`Delete ${product.name}`} aria-label={`Delete ${product.name}`} className="flex size-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"><Trash2 className="size-4" aria-hidden="true" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {isFormOpen && <ProductFormDialog product={editingProduct} onClose={() => setIsFormOpen(false)} onSaved={(product) => { setProducts((current) => editingProduct ? current.map((item) => item.id === product.id ? product : item) : [product, ...current]); setIsFormOpen(false); }} />}
    </main>
  );
}

function SummaryCard({ label, value, note, icon: Icon, accent = "neutral" }: { label: string; value: number; note: string; icon: typeof Package; accent?: "neutral" | "amber" | "emerald" }) {
  const iconColors = accent === "amber" ? "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400" : accent === "emerald" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return <section className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-zinc-500">{note}</p></div><div className={`flex size-11 items-center justify-center rounded-md ${iconColors}`}><Icon className="size-5" aria-hidden="true" /></div></section>;
}

function ProductThumbnail({ product }: { product: Product }) {
  return <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">{product.image_url ? <Image src={product.image_url} alt="" width={48} height={48} unoptimized className="size-full object-cover" /> : <ImagePlus className="size-5 text-zinc-400" aria-hidden="true" />}</div>;
}

function ProductFormDialog({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: (product: Product) => void }) {
  const [imagePreview, setImagePreview] = useState(product?.image_url ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const categoryOptions = product && !PRODUCT_CATEGORIES.some((category) => category === product.category)
    ? [product.category, ...PRODUCT_CATEGORIES]
    : PRODUCT_CATEGORIES;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("is_available", String(form.get("is_available") === "on"));
    if (product) {
      form.set("id", product.id);
      form.set("image_url", product.image_url ?? "");
    }
    try {
      const response = await fetch("/api/admin/products", {
        method: product ? "PATCH" : "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save product.");
      onSaved(result.product as Product);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save product.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-xl sm:rounded-lg sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Catalog</p><h2 id="product-dialog-title" className="mt-1 text-xl font-semibold">{product ? "Edit product" : "Add product"}</h2></div><button type="button" onClick={onClose} aria-label="Close dialog" className="flex size-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="size-4" /></button></div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Product name<input name="name" required maxLength={100} defaultValue={product?.name} className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-700 dark:bg-zinc-950" /></label><label className="block text-sm font-medium">Category<select name="category" required defaultValue={product?.category ?? "Milk Tea"} className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-700 dark:bg-zinc-950">{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
          <label className="block text-sm font-medium">Description<textarea name="description" rows={3} maxLength={500} defaultValue={product?.description} className="mt-1.5 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-700 dark:bg-zinc-950" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Price<input name="price" type="number" min="0" step="0.01" required defaultValue={product ? Number(product.price).toFixed(2) : ""} className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-700 dark:bg-zinc-950" /></label><label className="block text-sm font-medium">Product image<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) setImagePreview(URL.createObjectURL(file)); }} className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-medium dark:file:bg-zinc-800" /></label></div>
          {imagePreview && <div className="flex items-center gap-3"><Image src={imagePreview} alt="Product preview" width={64} height={64} unoptimized className="size-16 rounded-md border border-zinc-200 object-cover dark:border-zinc-700" /><span className="text-xs text-zinc-500">Image preview</span></div>}
          <label className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 text-sm font-medium dark:border-zinc-700"><input name="is_available" type="checkbox" defaultChecked={product?.is_available ?? true} className="size-4 accent-emerald-700" /><span>Available on store</span></label>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"><button type="button" onClick={onClose} disabled={isSaving} className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Cancel</button><button type="submit" disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{isSaving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}{isSaving ? "Saving" : product ? "Save changes" : "Create product"}</button></div>
        </form>
      </section>
    </div>
  );
}
