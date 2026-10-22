import {
  Crown,
  CupSoda,
  Droplets,
  Flame,
  Heart,
  Leaf,
  Sparkles,
} from "lucide-react";

import type { MegaMenuItem } from "@/customers/components/ui/mega-menu-navbar";

export const drinkCategories: MegaMenuItem[] = [
  { title: "Matcha", icon: Leaf, iconClassName: "text-lime-700 dark:text-lime-300" },
  { title: "Brown Sugar & Caramel Series", icon: Flame, iconClassName: "text-amber-700 dark:text-amber-300" },
  { title: "Taro & Earthy Roots", icon: Sparkles, iconClassName: "text-violet-600 dark:text-violet-300" },
  { title: "Fresh Fruit & Sparklers / Cold Brew Teas", icon: Droplets, iconClassName: "text-rose-600 dark:text-rose-300" },
  { title: "Cream Cheese / Cheese Foam Series", icon: Crown, iconClassName: "text-yellow-600 dark:text-yellow-300" },
  { title: "Specialty / Indulgent Blends", icon: CupSoda, iconClassName: "text-pink-600 dark:text-pink-300" },
  { title: "Health & Plant-Based (Wellness Series)", icon: Heart, iconClassName: "text-emerald-600 dark:text-emerald-300" },
].map((category) => ({
  ...category,
  href: `#${category.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "")}`,
}));

export const collections: MegaMenuItem[] = [
  {
    title: "Best Sellers",
    description: "Our most ordered drinks, ranked by units sold",
    href: "#best-sellers",
    icon: Flame,
    iconClassName: "text-orange-600 dark:text-orange-300",
  },
  {
    title: "New This Week",
    description: "New drinks recently posted by our clients",
    href: "#new",
    icon: Sparkles,
    iconClassName: "text-indigo-600 dark:text-indigo-300",
  },
];
