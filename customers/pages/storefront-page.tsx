"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { GooeySearch } from "@/customers/components/ui/gooey-search";
import { MegaMenuNavbar } from "@/customers/components/ui/mega-menu-navbar";
import { ProductGrid } from "@/customers/components/ui/product-grid";
import { StorefrontDoodleBackground } from "@/customers/components/ui/storefront-doodle-background";
import { StorefrontSplash } from "@/customers/components/ui/storefront-splash";
import type { Product } from "@/customers/data/products";
import { useCart } from "@/customers/state/cart-context";

const drinkCategories = [
  { title: "Matcha"},
  { title: "Brown Sugar & Caramel Series"},
  { title: "Taro & Earthy Roots"},
  { title: "Fresh Fruit & Sparklers / Cold Brew Teas"},
  { title: "Cream Cheese / Cheese Foam Series"},
  { title: "Specialty / Indulgent Blends"},
  { title: "Health & Plant-Based (Wellness Series)"},
].map((category) => ({
  ...category,
  href: `#${category.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "")}`,
}));

const collections = [
  { title: "Best Sellers", description: "Our most ordered drinks, ranked by units sold", href: "#best-sellers" },
  { title: "New This Week", description: "New drinks recently posted by our clients", href: "#new" },
];

export default function Home() {
  const { products, isCatalogLoading, catalogError, refreshProducts } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  useEffect(() => {
    const syncCategoryFromHash = () => {
      const hash = window.location.hash;
      const category = drinkCategories.find((item) => item.href === hash);
      const collection = collections.find((item) => item.href === hash);
      setSelectedCategory(category?.title ?? null);
      setSelectedCollection(collection?.title ?? null);
      setSearchQuery(category?.title ?? collection?.title ?? decodeURIComponent(hash.slice(1)).replaceAll("-", " "));
    };

    syncCategoryFromHash();
    window.addEventListener("hashchange", syncCategoryFromHash);
    return () => window.removeEventListener("hashchange", syncCategoryFromHash);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSelectedCategory(null);
    setSelectedCollection(null);
    setSearchQuery(query);

    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(query.trim().toLowerCase()) ||
          product.description.toLowerCase().includes(query.trim().toLowerCase()) ||
          product.category.toLowerCase().includes(query.trim().toLowerCase()),
      )
      .map((product) => product.name);
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (selectedCollection === "Best Sellers") {
      return products
        .filter((product): product is Product & { best_seller_rank: number } => product.best_seller_rank !== null)
        .sort((first, second) => first.best_seller_rank - second.best_seller_rank);
    }

    if (selectedCollection === "New This Week") {
      return products
        .filter((product) => product.is_new_this_week)
        .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
    }

    if (selectedCategory) {
      const category = selectedCategory.toLowerCase();
      return products.filter(
        (product) =>
          product.category.trim().toLowerCase() === category ||
          (selectedCategory === "Matcha" && product.name.toLowerCase().includes("matcha")),
      );
    }

    const query = searchQuery.trim().toLowerCase();

    if (!query) return products;

    const exactNameMatches = products.filter(
      (product) => product.name.trim().toLowerCase() === query,
    );

    if (exactNameMatches.length > 0) return exactNameMatches;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query),
    );
  }, [products, searchQuery, selectedCategory, selectedCollection]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <StorefrontSplash />
      <MegaMenuNavbar
        brandName="Pearl & Pour"
        accountHref="/orders/track"
        accountLabel="Track orders"
        categories={drinkCategories}
        collections={collections}
        onDesktopOpenChange={setDesktopSidebarOpen}
      />
      <main className={`relative isolate min-h-screen px-4 py-10 lg:pr-12 ${desktopSidebarOpen ? "lg:pl-84" : "lg:pl-16"}`}>
        <StorefrontDoodleBackground count={Math.max(96, visibleProducts.length * 24)} />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10">
          <div className="flex justify-center">
            <GooeySearch
              placeholder="Search drinks..."
              buttonLabel="Find a drink"
              onSearch={handleSearch}
              onSelect={(productName) => {
                setSelectedCategory(null);
                setSelectedCollection(null);
                setSearchQuery(productName);
              }}
            />
          </div>
          {isCatalogLoading && <p role="status" className="text-center text-sm text-zinc-500">Loading today&apos;s drinks...</p>}
          {catalogError && <div role="alert" className="flex flex-wrap items-center justify-center gap-3 text-sm text-red-700"><span>{catalogError}</span><button type="button" onClick={() => void refreshProducts()} className="font-semibold underline underline-offset-2">Try again</button></div>}
          {!isCatalogLoading && !catalogError && products.length === 0 && <p className="text-center text-sm text-zinc-600">No drinks are available right now.</p>}
          {!isCatalogLoading && !catalogError && selectedCollection && visibleProducts.length === 0 && <p className="text-center text-sm text-zinc-600">{selectedCollection === "Best Sellers" ? "No drinks have been ordered yet." : "No new drinks have been posted this week."}</p>}
          <ProductGrid
            showDoodleBackground={false}
            products={visibleProducts}
            eyebrow={selectedCollection ?? "Freshly shaken"}
            title={selectedCollection ?? (searchQuery ? `Results for "${searchQuery}"` : "Your next favorite cup")}
            description={selectedCollection === "Best Sellers"
              ? "Customer favorites, ordered by the number of drinks sold."
              : selectedCollection === "New This Week"
                ? "The newest drinks posted by our clients in the last seven days."
                : searchQuery
                  ? `${visibleProducts.length} drink${visibleProducts.length === 1 ? "" : "s"} match your search.`
                  : "Small-batch milk teas and signature boba drinks, made to order."}
          />
        </div>
      </main>
    </div>
  );
}