"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  CupSoda,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";

import { StorefrontAmbientBackground } from "@/customers/components/ui/storefront-ambient-background";
import {
  DRINK_SIZES,
  ICE_LEVELS,
  PEARL_OPTIONS,
  SUGAR_LEVELS,
  getPearlPriceAdjustment,
  getSizePriceAdjustment,
} from "@/customers/data/drink-options";
import { useShops } from "@/customers/hooks/use-shops";
import { useCart } from "@/customers/state/cart-context";

function drinkAccent(category: string) {
  const value = category.toLowerCase();
  if (value.includes("matcha")) return "#65a30d";
  if (value.includes("brown sugar") || value.includes("caramel")) return "#b45309";
  if (value.includes("taro")) return "#8b5cf6";
  if (value.includes("fruit") || value.includes("sparkler")) return "#f43f5e";
  if (value.includes("cheese")) return "#ca8a04";
  if (value.includes("specialty") || value.includes("indulgent")) return "#db2777";
  if (value.includes("health") || value.includes("plant")) return "#059669";
  if (value.includes("milk tea")) return "#a16207";
  return "#6366f1";
}

function shortCategory(category: string) {
  return category.split(/\s*[/(]\s*/)[0].replace(/\s+Series$/i, "").trim();
}

const frostedPillLinkClassName =
  "inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-stone-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10 dark:hover:text-white";

const statChipClassName =
  "inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-stone-200";

const selectClassName =
  "mt-1.5 block w-full rounded-xl border border-stone-200/90 bg-white/90 px-3 py-2 text-xs font-medium text-stone-900 shadow-2xs outline-none transition focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-neutral-950/80 dark:text-stone-100 dark:focus:border-amber-400";

export default function CartPage() {
  const {
    items,
    products,
    totalItems,
    totalPrice,
    removeItem,
    updateQuantity,
    updateOptions,
    clearCart,
    isCatalogLoading,
    catalogError,
    refreshProducts,
  } = useCart();
  const { shops } = useShops();

  const shopsByName = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; logo_url: string | null }>();
    for (const shop of shops) {
      map.set(shop.name.trim().toLowerCase(), shop);
    }
    return map;
  }, [shops]);

  const cartShopNames = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      const product = products.find((candidate) => candidate.id === item.id);
      const shopName = product?.shop_name?.trim();
      if (shopName) names.add(shopName);
    }
    return [...names];
  }, [items, products]);

  if (isCatalogLoading) {
    return (
      <div className="relative min-h-screen">
        <StorefrontAmbientBackground />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 text-sm font-medium text-stone-600 dark:text-stone-300">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/80 bg-white/80 px-5 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/80">
            <span className="size-2 animate-ping rounded-full bg-amber-500" aria-hidden="true" />
            <span>Loading your cart...</span>
          </div>
        </main>
      </div>
    );
  }

  if (catalogError && products.length === 0) {
    return (
      <div className="relative min-h-screen">
        <StorefrontAmbientBackground />
        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="max-w-md rounded-3xl border border-white/80 bg-white/85 p-8 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/85">
            <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
              {catalogError}
            </p>
            <button
              type="button"
              onClick={() => void refreshProducts()}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-950 dark:hover:bg-stone-200"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="relative min-h-screen">
        <StorefrontAmbientBackground />
        <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className={frostedPillLinkClassName}>
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>Back to menu</span>
            </Link>
            <Link href="/orders/track" className={frostedPillLinkClassName}>
              <PackageCheck className="size-3.5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
              <span>Track orders</span>
            </Link>
          </div>

          <div className="my-auto py-12">
            <section className="mx-auto max-w-lg rounded-3xl border border-white/80 bg-white/80 p-8 text-center shadow-[0_24px_48px_-24px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:border-neutral-700/70 dark:bg-neutral-900/80 sm:p-10">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-900/10 bg-white/80 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-900/80 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-amber-200/80">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Cavitea &amp; Pastry
              </p>

              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-700 shadow-inner dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                <CupSoda className="size-8" aria-hidden="true" />
              </div>

              <h1 className="storefront-gradient-text text-3xl font-bold tracking-tight sm:text-4xl">
                Your cart is empty
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-stone-600 dark:text-stone-400">
                Looks like you haven&apos;t added any drinks yet. Explore freshly shaken milk teas, fruit teas, and house specialties.
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-stone-50 dark:text-stone-950 dark:hover:bg-stone-200"
                >
                  <span>Continue Shopping</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <StorefrontAmbientBackground />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Top Navigation Row */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className={frostedPillLinkClassName}>
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Continue Shopping</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/orders/track" className={frostedPillLinkClassName}>
              <PackageCheck className="size-3.5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
              <span>Track orders</span>
            </Link>
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/75 px-3.5 py-2 text-xs font-semibold text-stone-600 shadow-sm backdrop-blur-md transition hover:border-red-200 hover:bg-red-50/90 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:border-red-900/60 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              <span>Clear Cart</span>
            </button>
          </div>
        </div>

        {/* Homepage-Matched Hero Header */}
        <header className="relative z-10 mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-900/10 bg-white/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-900/80 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-amber-200/80">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Cavitea &amp; Pastry · Your Order
          </p>

          <h1 className="text-balance text-4xl font-bold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            <span className="relative inline-block">
              <span className="storefront-gradient-text relative z-10">Shopping Cart</span>
              <svg
                aria-hidden="true"
                className="absolute -bottom-3 left-0 h-3 w-full text-amber-500/80 sm:-bottom-4 sm:h-4 dark:text-amber-300/70"
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
                fill="none"
              >
                <path d="M2 12 Q35 2 95 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" pathLength="1">
                  <animate attributeName="stroke-dasharray" values="0 1;1 0" dur="700ms" fill="freeze" />
                </path>
                <path d="M5 15 Q40 18 98 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" pathLength="1">
                  <animate attributeName="stroke-dasharray" values="0 1;1 0" dur="800ms" begin="120ms" fill="freeze" />
                </path>
              </svg>
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-pretty text-sm leading-6 text-stone-600 dark:text-stone-400 sm:text-base">
            You have {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart. Customize each drink&apos;s size, sweetness, ice, and pearls before checkout.
          </p>

          <ul className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Cart summary highlights">
            <li className={statChipClassName}>
              <CupSoda className="size-3.5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
              {totalItems} drink{totalItems === 1 ? "" : "s"}
            </li>
            {cartShopNames.length > 0 && (
              <li className={statChipClassName}>
                <Store className="size-3.5 text-violet-600 dark:text-violet-300" aria-hidden="true" />
                {cartShopNames.length} shop{cartShopNames.length === 1 ? "" : "s"}
              </li>
            )}
            <li className={statChipClassName}>
              <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
              Freshly shaken to order
            </li>
          </ul>
        </header>

        {/* Cart Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {/* Drink Line Items */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const product = products.find((p) => p.id === item.id);
              if (!product) return null;

              const accent = drinkAccent(product.category);
              const sizeAdjustment = getSizePriceAdjustment(item.size);
              const pearlAdjustment = getPearlPriceAdjustment(item.pearls);
              const unitPrice = product.price + pearlAdjustment + sizeAdjustment;
              const lineTotal = unitPrice * item.quantity;
              const matchedShop = product.shop_name
                ? shopsByName.get(product.shop_name.trim().toLowerCase())
                : undefined;

              const cardStyle = {
                "--product-accent": accent,
                animationDelay: `${Math.min(index, 8) * 55}ms`,
              } as React.CSSProperties;

              return (
                <article
                  key={item.lineId}
                  style={cardStyle}
                  className="storefront-card-enter relative overflow-hidden rounded-2xl border border-white/75 bg-white/80 p-4 shadow-[0_10px_35px_-24px_rgba(0,0,0,0.42)] backdrop-blur-md transition-[border-color,box-shadow,transform] duration-300 hover:border-[color-mix(in_srgb,var(--product-accent)_45%,white)] hover:shadow-[0_22px_42px_-24px_color-mix(in_srgb,var(--product-accent)_45%,transparent)] dark:border-neutral-700/70 dark:bg-neutral-900/75 sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {/* Product Thumbnail */}
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/80 bg-stone-100 shadow-sm dark:border-white/10 dark:bg-neutral-800 sm:h-28 sm:w-28">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={112}
                          height={112}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-stone-200 dark:from-neutral-800 dark:to-neutral-900">
                          <span className="text-base font-bold text-stone-600 dark:text-stone-300">
                            {product.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {product.category && (
                        <span className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex max-w-[90%] items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-stone-800 shadow-2xs backdrop-blur-xs dark:bg-neutral-950/80 dark:text-stone-100">
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full bg-[var(--product-accent)]"
                          />
                          <span className="truncate">{shortCategory(product.category)}</span>
                        </span>
                      )}
                    </div>

                    {/* Product Info & Controls */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold tracking-tight text-stone-950 dark:text-stone-50 sm:text-xl">
                            {product.name}
                          </h2>
                          {product.shop_name && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                              <Store className="size-3.5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                              <span>
                                Sold by{" "}
                                {matchedShop ? (
                                  <Link
                                    href={`/shops/${encodeURIComponent(matchedShop.slug)}`}
                                    className="font-semibold text-stone-800 underline-offset-2 hover:text-amber-700 hover:underline dark:text-stone-200 dark:hover:text-amber-300"
                                  >
                                    {product.shop_name}
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-stone-700 dark:text-stone-200">
                                    {product.shop_name}
                                  </span>
                                )}
                              </span>
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.lineId)}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-stone-200/80 bg-white/80 text-stone-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:border-white/10 dark:bg-white/5 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                          aria-label={`Remove ${product.name}`}
                          title="Remove item"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>

                      {product.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-stone-600 dark:text-stone-400 sm:text-sm">
                          {product.description}
                        </p>
                      )}

                      {/* Price & Quantity Stepper Row */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xl font-bold text-stone-950 dark:text-stone-50">
                            ${unitPrice.toFixed(2)}
                          </span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">per cup</span>
                          {item.quantity > 1 && (
                            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                              Line total: ${lineTotal.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="inline-flex items-center gap-1 rounded-full border border-stone-200/90 bg-white/90 p-1 shadow-2xs dark:border-white/10 dark:bg-neutral-950/80">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.lineId, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            className="flex size-7 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-950 disabled:opacity-40 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3.5" aria-hidden="true" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-bold text-stone-900 dark:text-stone-100">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                            className="flex size-7 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Drink Customization Controls */}
                      <div className="mt-4 grid gap-2.5 rounded-xl border border-stone-200/70 bg-[#fdf8f1]/70 p-3 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block text-[11px] font-semibold tracking-wide text-stone-600 dark:text-stone-400">
                          <span className="flex items-center gap-1.5">
                            <CupSoda className="size-3.5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                            <span>Size</span>
                          </span>
                          <select
                            value={item.size}
                            onChange={(event) => {
                              const size = DRINK_SIZES.find((option) => option.value === event.currentTarget.value)?.value;
                              if (size) updateOptions(item.lineId, { size });
                            }}
                            className={selectClassName}
                          >
                            {DRINK_SIZES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-[11px] font-semibold tracking-wide text-stone-600 dark:text-stone-400">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="size-3.5 text-rose-600 dark:text-rose-300" aria-hidden="true" />
                            <span>Sugar Level</span>
                          </span>
                          <select
                            value={item.sugarLevel}
                            onChange={(event) => {
                              const sugarLevel = SUGAR_LEVELS.find(
                                (option) => option.value === event.currentTarget.value,
                              )?.value;
                              if (sugarLevel) updateOptions(item.lineId, { sugarLevel });
                            }}
                            className={selectClassName}
                          >
                            {SUGAR_LEVELS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-[11px] font-semibold tracking-wide text-stone-600 dark:text-stone-400">
                          <span className="flex items-center gap-1.5">
                            <Snowflake className="size-3.5 text-sky-600 dark:text-sky-300" aria-hidden="true" />
                            <span>Ice Level</span>
                          </span>
                          <select
                            value={item.iceLevel}
                            onChange={(event) => {
                              const iceLevel = ICE_LEVELS.find(
                                (option) => option.value === event.currentTarget.value,
                              )?.value;
                              if (iceLevel) updateOptions(item.lineId, { iceLevel });
                            }}
                            className={selectClassName}
                          >
                            {ICE_LEVELS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-[11px] font-semibold tracking-wide text-stone-600 dark:text-stone-400">
                          <span className="flex items-center gap-1.5">
                            <CircleDot className="size-3.5 text-violet-600 dark:text-violet-300" aria-hidden="true" />
                            <span>Tapioca / Pearls</span>
                          </span>
                          <select
                            value={item.pearls}
                            onChange={(event) => {
                              const pearls = PEARL_OPTIONS.find(
                                (option) => option.value === event.currentTarget.value,
                              )?.value;
                              if (pearls) updateOptions(item.lineId, { pearls });
                            }}
                            className={selectClassName}
                          >
                            {PEARL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Sticky Frosted Order Summary */}
          <aside className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_18px_45px_-24px_rgba(0,0,0,0.45)] backdrop-blur-xl dark:border-neutral-700/70 dark:bg-neutral-900/80 lg:sticky lg:top-8">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                <ShoppingBag className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-stone-950 dark:text-stone-50">
                  Order Summary
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {totalItems} drink{totalItems === 1 ? "" : "s"}
                  {cartShopNames.length > 0
                    ? ` · ${cartShopNames.length} shop${cartShopNames.length === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
            </div>

            {cartShopNames.length > 1 && (
              <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-50/80 px-3.5 py-2.5 text-xs leading-5 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                Your cart includes drinks from <strong>{cartShopNames.length} shops</strong>. We&apos;ll create a separate tracking link for each shop at checkout.
              </p>
            )}

            <dl className="mt-5 space-y-3 border-t border-stone-200/80 pt-4 text-sm dark:border-white/10">
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-stone-900 dark:text-stone-100">${totalPrice.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <dt>Delivery</dt>
                <dd className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                  Free
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-stone-200/80 pt-3 text-base font-bold text-stone-950 dark:border-white/10 dark:text-stone-50">
                <dt>Total ({totalItems} item{totalItems !== 1 ? "s" : ""})</dt>
                <dd className="text-2xl tracking-tight">${totalPrice.toFixed(2)}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href="/checkout"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-stone-50 dark:text-stone-950 dark:hover:bg-stone-200"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>

              <Link
                href="/"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-200/90 bg-white/80 px-5 py-2.5 text-xs font-semibold text-stone-700 transition hover:bg-white hover:text-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <span>Continue Shopping</span>
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
