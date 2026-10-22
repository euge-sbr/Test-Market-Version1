"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { LoaderCircle, LogOut, MapPin, Megaphone, Pencil, Store } from "lucide-react";

type ShopProfile = {
  name: string;
  slug: string;
  logo_url: string | null;
  location: string | null;
  promotion: string | null;
  bio: string | null;
};

type Status = "checking" | "signed-out" | "platform" | "ready";

const inputClass =
  "mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-700 dark:bg-zinc-950";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function ShopIcon({ profile, previewUrl, size }: { profile: ShopProfile; previewUrl?: string; size: number }) {
  const src = previewUrl || profile.logo_url;
  const box = { width: size, height: size };

  if (src) {
    return (
      <Image
        src={src}
        alt={`${profile.name} logo`}
        width={size}
        height={size}
        unoptimized
        style={box}
        className="shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
      />
    );
  }

  return (
    <span
      style={box}
      className="flex shrink-0 items-center justify-center rounded-full bg-emerald-700 text-2xl font-bold text-white"
      aria-hidden="true"
    >
      {initials(profile.name)}
    </span>
  );
}

export default function AdminProfilePage() {
  const [status, setStatus] = useState<Status>("checking");
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoPreview, setLogoPreview] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/admin/profile", { cache: "no-store" });
        if (cancelled) return;
        if (response.status === 401) return setStatus("signed-out");
        if (response.status === 403) return setStatus("platform");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load profile.");
        setProfile(result.profile as ShopProfile);
        setStatus("ready");
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Could not load profile.");
        setStatus("ready");
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        body: new FormData(event.currentTarget),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save profile.");
      setProfile(result.profile as ShopProfile);
      setLogoPreview("");
      setEditing(false);
      setNotice("Profile saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.href = "/admin/orders";
  }

  if (status === "checking") {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">Loading profile...</main>;
  }

  if (status === "signed-out" || status === "platform") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
        <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-7 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Store className="mx-auto size-8 text-emerald-700" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">
            {status === "signed-out" ? "Sign in to see your profile" : "No shop profile for this account"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {status === "signed-out"
              ? "Sign in with your client email from the Orders page."
              : "Platform accounts manage shops from the Clients page. Sign in with a client account to edit a shop profile."}
          </p>
          <a
            href={status === "signed-out" ? "/admin/orders" : "/admin/clients"}
            className="mt-5 inline-flex h-10 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {status === "signed-out" ? "Go to sign in" : "Go to Clients"}
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-emerald-700 text-white">
              <Store className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Cavitea &amp; Pastry</p>
              <h1 className="text-lg font-semibold">Profile</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav aria-label="Admin sections" className="mr-2 flex items-center gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
              <a href="/admin/orders" className="rounded px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">Orders</a>
              <a href="/admin/products" className="rounded px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">Products</a>
              <a href="/admin/profile" aria-current="page" className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white">Profile</a>
            </nav>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {error && !profile && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {profile && (
          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-4">
              <ShopIcon profile={profile} previewUrl={logoPreview} size={80} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold">{profile.name}</h2>
                {!editing && profile.location && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <MapPin className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{profile.location}</span>
                  </p>
                )}
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(true); setNotice(""); setError(""); }}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit
                </button>
              )}
            </div>

            {notice && <p role="status" className="mt-4 text-sm text-emerald-700">{notice}</p>}

            {editing ? (
              <form onSubmit={handleSave} className="mt-6 space-y-4">
                <label className="block text-sm font-medium">
                  Shop icon
                  <input
                    name="logo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setLogoPreview(URL.createObjectURL(file));
                    }}
                    className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-medium dark:file:bg-zinc-800"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Location
                  <input name="location" maxLength={120} defaultValue={profile.location ?? ""} placeholder="Street, city" className={inputClass} />
                </label>
                <label className="block text-sm font-medium">
                  Promotion
                  <input name="promotion" maxLength={160} defaultValue={profile.promotion ?? ""} placeholder="Buy 2 get 1 free this week" className={inputClass} />
                </label>
                <label className="block text-sm font-medium">
                  Bio
                  <textarea name="bio" rows={4} maxLength={500} defaultValue={profile.bio ?? ""} placeholder="Tell customers about your shop" className={`${inputClass} resize-y`} />
                </label>
                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => { setEditing(false); setLogoPreview(""); setError(""); }}
                    className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                    {saving ? "Saving" : "Save changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 space-y-4 text-sm">
                {profile.promotion && (
                  <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                    <Megaphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {profile.promotion}
                  </p>
                )}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Bio</h3>
                  <p className="mt-2 leading-6 text-zinc-700 dark:text-zinc-300">{profile.bio || "No bio yet. Click Edit to add one."}</p>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
