import {
  CircleDot,
  Coffee,
  CupSoda,
  Droplets,
  Heart,
  Leaf,
  Milk,
  Sparkles,
  Star,
} from "lucide-react";

import { cn } from "@/shared/utils";

const STOREFRONT_DOODLES = [
  CupSoda,
  CircleDot,
  Sparkles,
  Milk,
  Heart,
  Coffee,
  Droplets,
  Leaf,
  Star,
] as const;
const STOREFRONT_DOODLE_COLORS = [
  "text-rose-500 dark:text-rose-300",
  "text-amber-500 dark:text-amber-300",
  "text-violet-500 dark:text-violet-300",
  "text-sky-500 dark:text-sky-300",
  "text-pink-500 dark:text-pink-300",
  "text-orange-500 dark:text-orange-300",
  "text-cyan-600 dark:text-cyan-300",
  "text-emerald-600 dark:text-emerald-300",
  "text-indigo-500 dark:text-indigo-300",
] as const;

export function StorefrontDoodleBackground({
  className,
  count = 96,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 grid auto-rows-[112px] grid-cols-4 overflow-hidden opacity-[0.3] dark:opacity-[0.34] sm:grid-cols-6 xl:grid-cols-8",
        className,
      )}
    >
      {Array.from({ length: count }, (_, index) => {
        const Doodle = STOREFRONT_DOODLES[index % STOREFRONT_DOODLES.length];
        const rotation = ((index * 37) % 31) - 15;

        return (
          <span key={index} className="flex items-center justify-center">
            <Doodle
              className={cn(
                STOREFRONT_DOODLE_COLORS[index % STOREFRONT_DOODLE_COLORS.length],
                index % 4 === 0 ? "size-7 sm:size-8" : "size-5 sm:size-6",
              )}
              strokeWidth={1.35}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </span>
        );
      })}
    </div>
  );
}
