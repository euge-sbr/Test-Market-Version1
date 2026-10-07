"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingCart, Star } from "lucide-react";

import { cn } from "@/shared/utils";
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
}

const DEFAULT_PRODUCTS: Product[] = [];
const RATING_STORAGE_KEY = "pearlpour-product-ratings";

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
          className="flex size-6 items-center justify-center rounded-sm text-amber-500 transition-colors hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <Star
            aria-hidden="true"
            className="size-4"
            fill={rating <= Math.round(visibleRating) ? "currentColor" : "none"}
          />
        </button>
      ))}
      <span aria-live="polite" className="ml-1 whitespace-nowrap text-xs font-medium text-neutral-600 dark:text-neutral-400">
        {userRating !== undefined
          ? `${averageRating ? `${averageRating.toFixed(1)} · ` : ""}You: ${userRating}/5`
          : averageRating?.toFixed(1) ?? "New"}
      </span>
    </div>
  );
}

function AddToCartButton({ productName, onAdd }: { productName: string; onAdd: () => void }) {
  const [animationKey, setAnimationKey] = useState(0);
  const label = `Add ${productName} to cart`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onAdd();
        setAnimationKey((current) => current + 1);
      }}
      className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-neutral-50 transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:hover:bg-neutral-100"
    >
      <ShoppingCart
        key={animationKey}
        aria-hidden="true"
        className={cn("size-5", animationKey > 0 && "animate-cart-shake")}
      />
    </button>
  );
}

function ProductImage({ product, active }: { product: Product; active: boolean }) {
  const style = {
    "--product-accent": product.category === "Electronics" ? "#3b82f6" :
                       product.category === "Wearables" ? "#10b981" :
                       product.category === "Gaming" ? "#f59e0b" :
                       product.category === "Accessories" ? "#8b5cf6" :
                       "#6366f1",
  } as React.CSSProperties;

  return (
    <div
      style={style}
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
            "product-image-photo absolute inset-0 h-full w-full object-cover grayscale transition-[filter,transform,opacity] duration-500 ease-out motion-reduce:transition-none",
            active ? "scale-[1.02] grayscale-0" : "scale-100 grayscale",
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
        "@container relative h-full min-h-[620px] w-full overflow-x-hidden overflow-y-auto bg-white px-4 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-white sm:px-7 sm:py-12",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.075]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, currentColor 0.7px, transparent 0.8px)",
          backgroundSize: "12px 12px",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
            {eyebrow}
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            <span className="relative inline-block">
              <span className="relative z-10">{title}</span>
              <svg
                aria-hidden="true"
                className="absolute -bottom-3 left-0 h-3 w-full text-[#3b82f6] sm:-bottom-4 sm:h-4"
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
          <p className="mx-auto mt-6 max-w-xl text-pretty text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const active = product.id === resolvedActiveId;

            return (
              <div key={product.id} className="group product-card-touch-reveal">
                <div
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-lg border bg-white p-3 shadow-[0_10px_35px_-24px_rgba(0,0,0,0.42)] transition-[border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none dark:bg-neutral-900 sm:p-4",
                    active
                      ? "-translate-y-2 border-[color-mix(in_srgb,var(--product-accent)_55%,transparent)] shadow-[0_20px_40px_-24px_color-mix(in_srgb,var(--product-accent)_55%,transparent)]"
                      : "border-neutral-200 dark:border-neutral-700",
                    "focus-visible:ring-2 focus-visible:ring-[var(--product-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
                    "hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]"
                  )}
                  onClick={() => selectProduct(product.id)}
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
                  <div className="aspect-4/5 w-full overflow-hidden rounded-lg">
                    <ProductImage product={product} active={active} />
                  </div>

                  <div className="mt-4 flex flex-1 flex-col">
                    <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                      {product.name}
                    </h3>
                    {product.shop_name && (
                      <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        Sold by {product.shop_name}
                      </p>
                    )}
                    <p className="mb-2 line-clamp-2 text-neutral-600 dark:text-neutral-400">
                      {product.description}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                      <span className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
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