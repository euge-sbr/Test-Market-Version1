"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Flame, ShoppingCart, Sparkles } from "lucide-react";

import type { PublicShop } from "@/customers/components/ui/shop-profile-card";
import { LARGE_SIZE_PRICE_ADJUSTMENT } from "@/customers/data/drink-options";
import type { Product } from "@/customers/data/products";
import { cn } from "@/shared/utils";

export interface ProductDetailsDialogProps {
  /** The product to show. The dialog is closed while this is null. */
  product: Product | null;
  /** The shop that sells the product, when its profile is known. */
  shop?: PublicShop | null;
  onClose: () => void;
  onAddToCart: (productId: string) => void;
}

export function ProductDetailsDialog({ product, shop = null, onClose, onAddToCart }: ProductDetailsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const resetTimerRef = useRef<number | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [addedBurstCount, setAddedBurstCount] = useState(0);
  const isOpen = product !== null;
  const isJustAdded = addedBurstCount > 0;

  // Keep the latest onClose without restarting the effect below on every render.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setAddedBurstCount(0);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, [product?.id]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  // Lock page scroll, focus the close button, close on Escape,
  // trap Tab inside the dialog, and give focus back when it closes.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
      } else if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements.item(0);
        const lastElement = focusableElements.item(focusableElements.length - 1);
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-950 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                {product.category}
              </p>
              {product.best_seller_rank !== null && product.best_seller_rank <= 3 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                  <Flame className="size-3 fill-current" aria-hidden="true" />
                  #{product.best_seller_rank} Best Seller
                </span>
              )}
              {product.is_new_this_week && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
                  <Sparkles className="size-3" aria-hidden="true" />
                  New
                </span>
              )}
            </div>
            <h2 id="product-dialog-title" className="mt-1 text-xl font-bold text-zinc-950 dark:text-zinc-50">
              {product.name}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${product.name} details`}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {product.image && (
          <div className="relative mt-4 flex h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900 sm:h-52">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.name}
              className="relative h-full w-auto max-w-full object-contain"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              }}
            />
          </div>
        )}

        {product.shop_name && (
          <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
            {shop?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logo_url}
                alt=""
                aria-hidden="true"
                className="size-6 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
              />
            )}
            <span>
              Sold by{" "}
              {shop ? (
                <Link
                  href={`/shops/${encodeURIComponent(shop.slug)}`}
                  onClick={onClose}
                  className="font-medium text-zinc-900 underline-offset-2 hover:text-emerald-700 hover:underline dark:text-zinc-100 dark:hover:text-emerald-400"
                >
                  {shop.name}
                </Link>
              ) : (
                product.shop_name
              )}
            </span>
          </p>
        )}

        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{product.description}</p>
        <p className="mt-4 text-sm text-zinc-500">
          16 oz · 22 oz +${LARGE_SIZE_PRICE_ADJUSTMENT.toFixed(2)}
        </p>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">${product.price.toFixed(2)}</span>
          <div className="relative">
            {isJustAdded && (
              <span
                key={animationKey}
                aria-live="polite"
                className="animate-cart-badge-float pointer-events-none absolute -top-7 right-0 z-20 inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold tracking-tight whitespace-nowrap text-white shadow-md ring-2 ring-white dark:ring-zinc-950"
              >
                +{addedBurstCount} Added
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                onAddToCart(product.id);
                setAnimationKey((current) => current + 1);
                setAddedBurstCount((current) => current + 1);
                if (resetTimerRef.current !== null) {
                  window.clearTimeout(resetTimerRef.current);
                }
                resetTimerRef.current = window.setTimeout(() => {
                  setAddedBurstCount(0);
                  resetTimerRef.current = null;
                }, 950);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                isJustAdded
                  ? "scale-105 bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white",
              )}
            >
              {isJustAdded ? (
                <>
                  <Check
                    key={`dialog-check-${animationKey}`}
                    aria-hidden="true"
                    strokeWidth={2.75}
                    className="animate-cart-check-pop size-4"
                  />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingCart aria-hidden="true" className="size-4" />
                  <span>Add to cart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailsDialog;
