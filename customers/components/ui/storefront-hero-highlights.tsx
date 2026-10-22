"use client";

import { useEffect, useState } from "react";
import { CupSoda, Flame, Sparkles, Store } from "lucide-react";

const FLAVORS = [
  { label: "brown sugar", className: "text-amber-700 dark:text-amber-300" },
  { label: "taro", className: "text-violet-600 dark:text-violet-300" },
  { label: "matcha", className: "text-lime-700 dark:text-lime-300" },
  { label: "strawberry", className: "text-rose-600 dark:text-rose-300" },
  { label: "mango", className: "text-orange-600 dark:text-orange-300" },
  { label: "cheese foam", className: "text-yellow-600 dark:text-yellow-300" },
] as const;

/** "Craving something ___" with the flavor word swapping every couple of seconds. */
export function FlavorTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % FLAVORS.length), 2200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="flex flex-wrap items-baseline justify-center gap-x-1.5 text-base font-medium text-stone-600 dark:text-stone-300 sm:text-lg">
      <span>Craving something</span>
      {/* Every flavor shares one grid cell, so the line keeps the width of the longest word. */}
      <span className="inline-grid text-left">
        {FLAVORS.map((flavor, flavorIndex) => (
          <span
            key={flavor.label}
            className={`col-start-1 row-start-1 font-semibold ${flavor.className} ${
              flavorIndex === index ? "storefront-flavor-swap" : "invisible"
            }`}
          >
            {flavor.label}
          </span>
        ))}
      </span>
    </p>
  );
}

const chipClassName =
  "inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-md transition-all duration-200 dark:border-white/10 dark:bg-white/5 dark:text-stone-200";
const linkChipClassName = `${chipClassName} hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-white/10`;

/** Live marketplace numbers shown under the storefront headline. */
export function StorefrontStats({
  drinkCount,
  shopCount,
  newCount,
  hasBestSellers,
}: {
  drinkCount: number;
  shopCount: number;
  newCount: number;
  hasBestSellers: boolean;
}) {
  if (drinkCount === 0) return null;

  return (
    <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="Storefront highlights">
      <li className={chipClassName}>
        <CupSoda className="size-3.5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        {drinkCount} drink{drinkCount === 1 ? "" : "s"}
      </li>
      {shopCount > 0 && (
        <li className={chipClassName}>
          <Store className="size-3.5 text-violet-600 dark:text-violet-300" aria-hidden="true" />
          {shopCount} shop{shopCount === 1 ? "" : "s"}
        </li>
      )}
      {newCount > 0 && (
        <li>
          <a href="#new" className={linkChipClassName}>
            <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
            {newCount} new this week
          </a>
        </li>
      )}
      {hasBestSellers && (
        <li>
          <a href="#best-sellers" className={linkChipClassName}>
            <Flame className="size-3.5 text-orange-600 dark:text-orange-300" aria-hidden="true" />
            Best sellers
          </a>
        </li>
      )}
    </ul>
  );
}
