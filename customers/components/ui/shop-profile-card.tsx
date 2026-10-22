"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, MapPin, Megaphone, Plus } from "lucide-react";

export type PublicShop = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  location: string | null;
  promotion: string | null;
  bio: string | null;
};

export const FOLLOW_STORAGE_KEY = "pearlpour-followed-shops";

export function readFollowedShops(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(FOLLOW_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function shopInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function useShopFollow(slug: string) {
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const sync = () => setFollowing(readFollowedShops().includes(slug));
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  function toggleFollow() {
    if (!slug) return;
    const followed = readFollowedShops();
    const next = followed.includes(slug)
      ? followed.filter((item) => item !== slug)
      : [...followed, slug];
    setFollowing(next.includes(slug));
    try {
      window.localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Could not save followed shops:", error);
    }
  }

  return { following, toggleFollow };
}

export function ShopProfileCard({ shop, productCount }: { shop: PublicShop; productCount: number }) {
  const router = useRouter();
  const { following, toggleFollow } = useShopFollow(shop.slug);
  const shopHref = `/shops/${encodeURIComponent(shop.slug)}`;

  return (
    <section
      aria-label={`${shop.name} profile`}
      onClick={() => router.push(shopHref)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(shopHref);
        }
      }}
      tabIndex={0}
      role="link"
      className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-zinc-700 dark:focus-visible:ring-zinc-100 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        {shop.logo_url ? (
          // A native image keeps this component portable and avoids remote image config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.logo_url}
            alt={`${shop.name} logo`}
            className="size-20 shrink-0 rounded-full border border-zinc-200 object-cover transition-transform duration-200 group-hover:scale-105 dark:border-zinc-700"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-2xl font-bold text-white transition-transform duration-200 group-hover:scale-105 dark:bg-zinc-100 dark:text-zinc-950"
          >
            {shopInitials(shop.name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={shopHref}
              onClick={(event) => event.stopPropagation()}
              className="truncate text-2xl font-semibold tracking-tight text-zinc-950 group-hover:underline group-hover:underline-offset-4 dark:text-zinc-50"
            >
              {shop.name}
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 transition-colors group-hover:border-zinc-950 group-hover:bg-zinc-950 group-hover:text-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:border-zinc-50 dark:group-hover:bg-zinc-50 dark:group-hover:text-zinc-950">
              <span>Visit shop</span>
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {shop.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                {shop.location}
              </span>
            )}
            <span>
              {productCount} drink{productCount === 1 ? "" : "s"} available
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleFollow();
          }}
          aria-pressed={following}
          className={
            following
              ? "inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              : "inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          }
        >
          {following ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {following ? "Following" : "Follow"}
        </button>
      </div>

      {shop.promotion && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
          <Megaphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {shop.promotion}
        </p>
      )}

      {shop.bio && <p className="mt-4 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{shop.bio}</p>}
    </section>
  );
}

export default ShopProfileCard;
