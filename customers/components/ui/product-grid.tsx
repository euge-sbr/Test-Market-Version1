"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Flame,
  ShoppingCart,
  Sparkles,
  Star,
} from "lucide-react";

import { cn } from "@/shared/utils";
import { StorefrontDoodleBackground } from "@/customers/components/ui/storefront-doodle-background";
import { Product } from "@/customers/data/products";
import { LARGE_SIZE_PRICE_ADJUSTMENT } from "@/customers/data/drink-options";
import { useCart } from "@/customers/state/cart-context";

export interface ProductGridProps
  extends Omit<React.ComponentPropsWithoutRef<"section">, "title"> {
  eyebrow?: string;
  title?: string;
  description?: string;
  products?: Product[];
  /** Controlled active product id. */
  activeProductId?: string | null;
  /** Initial active product id when uncontrolled. */
  defaultActiveProductId?: string | null;
  onActiveProductChange?: (productId: string | null) => void;
  /** Automatically moves the reveal between products when idle. */
  autoPlay?: boolean;
  rotationInterval?: number;
  showDoodleBackground?: boolean;
  /** Called when a card is clicked, so the page can show the product details. */
  onProductSelect?: (product: Product) => void;
  /** Extra content under the headline (for example flavor ticker or storefront stats). */
  headerExtra?: React.ReactNode;
}

const DEFAULT_PRODUCTS: Product[] = [];
const RATING_STORAGE_KEY = "pearlpour-product-ratings";

/** Each drink category gets its own accent color (card glow, border and category chip). */
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

/** "Fresh Fruit & Sparklers / Cold Brew Teas" -> "Fresh Fruit & Sparklers" for the small chip. */
function shortCategory(category: string) {
  return category.split(/\s*[/(]\s*/)[0].replace(/\s+Series$/i, "").trim();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function ProductRating({
  name,
  averageRating,
  userRating,
  onRate,
}: {
  name: string;
  averageRating?: number;
  userRating?: number;
  onRate: (rating: number) => void;
}) {
  const visibleRating = userRating ?? averageRating ?? 0;

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={`Rate ${name}`}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          aria-label={`Rate ${name} ${rating} out of 5 stars`}
          aria-pressed={userRating === rating}
          title={`Rate ${rating} out of 5`}
          onClick={(event) => {
            event.stopPropagation();
            onRate(rating);
          }}
          className="flex size-4 items-center justify-center rounded-sm text-amber-500 transition-colors hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:size-6"
        >
          <Star
            aria-hidden="true"
            className="size-3 sm:size-4"
            fill={rating <= Math.round(visibleRating) ? "currentColor" : "none"}
          />
        </button>
      ))}
      <span aria-live="polite" className="ml-1 hidden whitespace-nowrap text-xs font-medium text-neutral-600 dark:text-neutral-400 sm:inline">
        {userRating !== undefined
          ? `${averageRating ? `${averageRating.toFixed(1)} · ` : ""}You: ${userRating}/5`
          : averageRating?.toFixed(1) ?? "New"}
      </span>
    </div>
  );
}

function AddToCartButton({ productName, onAdd }: { productName: string; onAdd: () => void }) {
  const [animationKey, setAnimationKey] = useState(0);
  const [addedBurstCount, setAddedBurstCount] = useState(0);
  const resetTimerRef = useRef<number | null>(null);
  const isJustAdded = addedBurstCount > 0;
  const label = `Add ${productName} to cart`;

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative ml-auto shrink-0">
      {isJustAdded && (
        <span
          key={animationKey}
          aria-live="polite"
          className="animate-cart-badge-float pointer-events-none absolute -top-7 right-0 z-20 inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold tracking-tight whitespace-nowrap text-white shadow-md ring-2 ring-white dark:ring-neutral-900"
        >
          +{addedBurstCount} Added
        </span>
      )}
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          onAdd();
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
          "flex size-8 items-center justify-center rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:size-10",
          isJustAdded
            ? "scale-105 bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500"
            : "bg-neutral-900 text-neutral-50 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white",
        )}
      >
        {isJustAdded ? (
          <Check
            key={`check-${animationKey}`}
            aria-hidden="true"
            strokeWidth={2.75}
            className="animate-cart-check-pop size-4 sm:size-5"
          />
        ) : (
          <ShoppingCart
            aria-hidden="true"
            className="size-4 sm:size-5"
          />
        )}
      </button>
    </div>
  );
}

function ProductImage({ product, active }: { product: Product; active: boolean }) {
  // --product-accent is set on the card wrapper (see ProductGrid) so the border, glow and chip share it.
  return (
    <div
      data-mobile-featured="true"
      className={cn(
        "product-image-frame relative h-full overflow-hidden rounded-xl bg-neutral-100 transition-colors duration-500 dark:bg-neutral-900",
        active && "bg-[color-mix(in_srgb,var(--product-accent)_10%,white)] dark:bg-[color-mix(in_srgb,var(--product-accent)_13%,#0a0a0a)]",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "product-image-glow absolute inset-0 opacity-55 transition-opacity duration-500",
          active && "opacity-100",
        )}
        style={{
          background:
            "radial-gradient(circle at 68% 20%, color-mix(in srgb, var(--product-accent) 36%, transparent), transparent 36%), radial-gradient(circle at 22% 82%, color-mix(in srgb, var(--product-accent) 16%, transparent), transparent 42%)",
        }}
      />

      {product.image ? (
        // A native image keeps the component portable across React frameworks.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          draggable={false}
          className={cn(
            "product-image-photo absolute inset-0 h-full w-full object-cover transition-[filter,transform,opacity] duration-500 ease-out motion-reduce:transition-none",
            active ? "scale-[1.04] saturate-[1.08]" : "scale-100 saturate-100",
          )}
          style={{ objectPosition: "center top" }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-end overflow-hidden">
          <div
            aria-hidden="true"
            className={cn(
              "absolute top-[13%] aspect-square h-[36%] rounded-full bg-neutral-300 transition-[transform,background-color] duration-500 dark:bg-neutral-700",
              active && "-translate-y-0.5 scale-105 bg-[var(--product-accent)]",
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "absolute -bottom-[12%] h-[66%] w-[82%] rounded-t-[48%] bg-neutral-300/90 transition-[transform,background-color] duration-500 dark:bg-neutral-700/90",
              active && "scale-105 bg-[var(--product-accent)]",
            )}
          />
          <span className="relative z-10 mb-[18%] text-2xl font-semibold tracking-[-0.08em] text-white mix-blend-difference">
            {initials(product.name)}
          </span>
        </div>
      )}

      <div
        aria-hidden="true"
        className={cn(
          "product-image-shade pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

export function ProductGrid({
  eyebrow = "Featured Products",
  title = "Our Product Collection",
  description = "Explore our curated selection of quality products.",
  products = DEFAULT_PRODUCTS,
  activeProductId,
  defaultActiveProductId,
  onActiveProductChange,
  autoPlay = true,
  rotationInterval = 2800,
  showDoodleBackground = true,
  onProductSelect,
  headerExtra,
  className,
  ...props
}: ProductGridProps) {
  const { addItem } = useCart();
  const firstProductId = products[0]?.id ?? null;
  const [internalActiveId, setInternalActiveId] = useState<string | null>(
    defaultActiveProductId === undefined ? firstProductId : defaultActiveProductId,
  );
  const [interacting, setInteracting] = useState(false);
  const [customerRatings, setCustomerRatings] = useState<Record<string, number>>({});
  const isControlled = activeProductId !== undefined;

  useEffect(() => {
    let loadTimer: number | undefined;

    try {
      const savedRatings = window.localStorage.getItem(RATING_STORAGE_KEY);
      if (!savedRatings) return;

      const parsedRatings: unknown = JSON.parse(savedRatings);
      if (!parsedRatings || typeof parsedRatings !== "object" || Array.isArray(parsedRatings)) return;

      const validRatings = Object.fromEntries(
        Object.entries(parsedRatings).filter(
          ([, rating]) => typeof rating === "number" && Number.isInteger(rating) && rating >= 1 && rating <= 5,
        ),
      );
      loadTimer = window.setTimeout(() => setCustomerRatings(validRatings), 0);
    } catch (error) {
      console.error("Could not load product ratings:", error);
    }

    return () => {
      if (loadTimer !== undefined) window.clearTimeout(loadTimer);
    };
  }, []);

  const productIds = useMemo(() => new Set(products.map((product) => product.id)), [products]);
  const requestedActiveId = isControlled ? activeProductId : internalActiveId;
  const resolvedActiveId =
    requestedActiveId && productIds.has(requestedActiveId) ? requestedActiveId : firstProductId;

  const selectProduct = useCallback(
    (productId: string | null) => {
      if (!isControlled) setInternalActiveId(productId);
      onActiveProductChange?.(productId);
    },
    [isControlled, onActiveProductChange],
  );

  useEffect(() => {
    if (!autoPlay || interacting || products.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      const currentIndex = products.findIndex((product) => product.id === resolvedActiveId);
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % products.length;
      selectProduct(products[nextIndex]?.id ?? null);
    }, Math.max(rotationInterval, 1200));

    return () => window.clearInterval(timer);
  }, [autoPlay, interacting, products, resolvedActiveId, rotationInterval, selectProduct]);

  const handleAddToCart = useCallback((productId: string) => {
    addItem(productId);
  }, [addItem]);

  const handleRateProduct = useCallback((productId: string, rating: number) => {
    const updatedRatings = { ...customerRatings, [productId]: rating };
    setCustomerRatings(updatedRatings);

    try {
      window.localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(updatedRatings));
    } catch (error) {
      console.error("Could not save product rating:", error);
    }
  }, [customerRatings]);

  return (
    <section
      className={cn(
        "@container relative h-full min-h-[620px] w-full overflow-x-hidden overflow-y-auto px-4 py-10 text-neutral-950 dark:text-white sm:px-7 sm:py-12",
        showDoodleBackground ? "bg-white dark:bg-neutral-950" : "bg-transparent",
        className,
      )}
      {...props}
    >
      <div className="relative mx-auto w-full max-w-6xl">
        {showDoodleBackground && <StorefrontDoodleBackground />}

        <header className="relative z-10 mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-900/10 bg-white/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-900/80 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-amber-200/80">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {eyebrow}
          </p>
          <h2 className="text-balance text-4xl font-bold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            <span className="relative inline-block">
              <span className="storefront-gradient-text relative z-10">{title}</span>
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
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-pretty text-sm leading-6 text-stone-600 dark:text-stone-400 sm:text-base">
            {description}
          </p>
          {headerExtra && <div className="mt-6">{headerExtra}</div>}
        </header>

        <div className="relative z-10 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
          {products.map((product, index) => {
            const active = product.id === resolvedActiveId;
            const cardStyle = {
              "--product-accent": drinkAccent(product.category),
              animationDelay: `${Math.min(index, 12) * 55}ms`,
            } as React.CSSProperties;

            return (
              <div key={product.id} className="group product-card-touch-reveal storefront-card-enter" style={cardStyle}>
                <div
                  className={cn(
                    "relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border p-2 shadow-[0_10px_35px_-24px_rgba(0,0,0,0.42)] transition-[border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none sm:p-4",
                    showDoodleBackground ? "bg-white dark:bg-neutral-900" : "bg-white/80 backdrop-blur-md dark:bg-neutral-900/75",
                    active
                      ? "-translate-y-2 border-[color-mix(in_srgb,var(--product-accent)_55%,transparent)] shadow-[0_24px_44px_-22px_color-mix(in_srgb,var(--product-accent)_60%,transparent)]"
                      : "border-white/70 dark:border-neutral-700/70",
                    "focus-visible:ring-2 focus-visible:ring-[var(--product-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
                    "hover:shadow-[0_24px_40px_-22px_color-mix(in_srgb,var(--product-accent)_55%,transparent)]"
                  )}
                  onClick={() => {
                    selectProduct(product.id);
                    onProductSelect?.(product);
                  }}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") {
                      setInteracting(true);
                      selectProduct(product.id);
                    }
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === "mouse") setInteracting(false);
                  }}
                  onFocus={() => {
                    setInteracting(true);
                    selectProduct(product.id);
                  }}
                  onBlur={() => setInteracting(false)}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl sm:aspect-4/5">
                    <ProductImage product={product} active={active} />
                    <span aria-hidden="true" className="product-card-shine" />
                    {product.category && (
                      <span className="pointer-events-none absolute bottom-2 left-2 z-20 hidden max-w-[85%] items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-neutral-800 shadow-sm backdrop-blur-sm dark:bg-neutral-950/70 dark:text-neutral-100 sm:bottom-3 sm:left-3 sm:inline-flex">
                        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[var(--product-accent)]" />
                        <span className="truncate">{shortCategory(product.category)}</span>
                      </span>
                    )}
                    {(product.best_seller_rank !== null && product.best_seller_rank <= 3 || product.is_new_this_week) && (
                      <div className="pointer-events-none absolute left-2 top-2 z-20 flex flex-wrap gap-1.5 sm:left-3 sm:top-3">
                        {product.best_seller_rank !== null && product.best_seller_rank <= 3 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold tracking-tight text-white shadow-sm backdrop-blur-xs sm:px-2.5 sm:py-1 sm:text-xs">
                            <Flame className="size-3 fill-current sm:size-3.5" aria-hidden="true" />
                            <span>#{product.best_seller_rank} Best Seller</span>
                          </span>
                        )}
                        {product.is_new_this_week && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/95 px-2 py-0.5 text-[10px] font-bold tracking-tight text-white shadow-sm backdrop-blur-xs sm:px-2.5 sm:py-1 sm:text-xs">
                            <Sparkles className="size-3 sm:size-3.5" aria-hidden="true" />
                            <span>New</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex flex-1 flex-col sm:mt-4">
                    <h3 className="mb-1 line-clamp-2 text-xs font-semibold leading-tight text-neutral-900 dark:text-neutral-50 sm:mb-2 sm:text-lg sm:leading-normal">
                      {product.name}
                    </h3>
                    {product.shop_name && (
                      <p className="mb-2 hidden text-xs font-medium text-neutral-500 dark:text-neutral-400 sm:block">
                        Sold by {product.shop_name}
                      </p>
                    )}
                    <p className="mb-2 hidden line-clamp-2 text-neutral-600 dark:text-neutral-400 sm:block">
                      {product.description}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-1 pt-2 sm:gap-2 sm:pt-3">
                      <span className="text-sm font-bold text-neutral-900 dark:text-neutral-50 sm:text-xl">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="hidden text-xs text-neutral-500 dark:text-neutral-400 sm:inline">
                        16 oz · 22 oz +${LARGE_SIZE_PRICE_ADJUSTMENT.toFixed(2)}
                      </span>
                      <ProductRating
                        name={product.name}
                        averageRating={product.rating}
                        userRating={customerRatings[product.id]}
                        onRate={(rating) => handleRateProduct(product.id, rating)}
                      />
                      <AddToCartButton productName={product.name} onAdd={() => handleAddToCart(product.id)} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ProductGrid;
