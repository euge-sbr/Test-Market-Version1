"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, MapPin, Megaphone, Plus, Star, Store } from "lucide-react";

import { GooeySearch } from "@/customers/components/ui/gooey-search";
import { MegaMenuNavbar } from "@/customers/components/ui/mega-menu-navbar";
import { ProductDetailsDialog } from "@/customers/components/ui/product-details-dialog";
import { ProductGrid } from "@/customers/components/ui/product-grid";
import { shopInitials, useShopFollow } from "@/customers/components/ui/shop-profile-card";
import { StorefrontDoodleBackground } from "@/customers/components/ui/storefront-doodle-background";
import type { Product } from "@/customers/data/products";
import { collections, drinkCategories } from "@/customers/data/storefront-navigation";
import { useShops } from "@/customers/hooks/use-shops";
import { useCart } from "@/customers/state/cart-context";

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function ShopLandingPage({ slug }: { slug: string }) {
  const { products, isCatalogLoading, catalogError, refreshProducts, addItem } = useCart();
  const { shops, isLoading: isShopsLoading } = useShops();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  const decodedSlug = useMemo(() => decodeURIComponent(slug).trim().toLowerCase(), [slug]);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const category = drinkCategories.find((item) => item.href === hash);
      const collection = collections.find((item) => item.href === hash);
      setSelectedCategory(category?.title ?? null);
      setSelectedCollection(collection?.title ?? null);
      setSearchQuery("");
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const shop = useMemo(() => {
    return (
      shops.find(
        (candidate) =>
          candidate.slug.trim().toLowerCase() === decodedSlug ||
          candidate.name.trim().toLowerCase() === decodedSlug.replaceAll("-", " "),
      ) ?? null
    );
  }, [shops, decodedSlug]);

  const { following, toggleFollow } = useShopFollow(shop?.slug ?? decodedSlug);

  const shopProducts = useMemo(() => {
    const targetName = shop ? normalizeText(shop.name) : decodedSlug.replaceAll("-", " ");
    return products.filter((product) => normalizeText(product.shop_name ?? "") === targetName);
  }, [products, shop, decodedSlug]);

  const shopCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of shopProducts) {
      const cat = product.category.trim() || "Milk Tea";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count }));
  }, [shopProducts]);

  const handleSearch = useCallback(
    (query: string) => {
      setSelectedCategory(null);
      setSelectedCollection(null);
      setSearchQuery(query);

      const needle = normalizeText(query);
      return shopProducts
        .filter(
          (product) =>
            normalizeText(product.name).includes(needle) ||
            normalizeText(product.description).includes(needle) ||
            normalizeText(product.category).includes(needle),
        )
        .map((product) => ({
          label: product.name,
          subtitle: `${product.category} · $${product.price.toFixed(2)}`,
          imageUrl: product.image,
          kind: "product" as const,
        }));
    },
    [shopProducts],
  );

  const visibleProducts = useMemo(() => {
    if (selectedCollection === "Best Sellers") {
      return shopProducts
        .filter((product): product is Product & { best_seller_rank: number } => product.best_seller_rank !== null)
        .sort((first, second) => first.best_seller_rank - second.best_seller_rank);
    }

    if (selectedCollection === "New This Week") {
      return shopProducts
        .filter((product) => product.is_new_this_week)
        .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
    }

    if (selectedCategory) {
      const category = normalizeText(selectedCategory);
      return shopProducts.filter(
        (product) =>
          normalizeText(product.category) === category ||
          normalizeText(product.name).includes(category) ||
          normalizeText(product.description).includes(category),
      );
    }

    const query = normalizeText(searchQuery);
    if (!query) return shopProducts;

    const exactMatches = shopProducts.filter((product) => normalizeText(product.name) === query);
    if (exactMatches.length > 0) return exactMatches;

    return shopProducts.filter(
      (product) =>
        normalizeText(product.name).includes(query) ||
        normalizeText(product.description).includes(query) ||
        normalizeText(product.category).includes(query),
    );
  }, [shopProducts, selectedCategory, selectedCollection, searchQuery]);

  const averageRating = useMemo(() => {
    const rated = shopProducts.filter((product) => typeof product.rating === "number" && product.rating > 0);
    if (rated.length === 0) return null;
    const sum = rated.reduce((acc, item) => acc + (item.rating ?? 0), 0);
    return (sum / rated.length).toFixed(1);
  }, [shopProducts]);

  const isLoading = isCatalogLoading || isShopsLoading;
  const displayShopName =
    shop?.name ?? decodedSlug.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <MegaMenuNavbar
        brandName="Cavitea & Pastry"
        accountHref="/orders/track"
        accountLabel="Track orders"
        categories={drinkCategories}
        collections={collections}
        onDesktopOpenChange={setDesktopSidebarOpen}
      />

      <main
        className={`relative isolate min-h-screen px-4 py-10 lg:pr-12 ${
          desktopSidebarOpen ? "lg:pl-84" : "lg:pl-16"
        }`}
      >
        <StorefrontDoodleBackground count={Math.max(96, visibleProducts.length * 24)} />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10">
          {/* Top Search Bar — same GooeySearch experience as main storefront */}
          <div className="flex justify-center">
            <GooeySearch
              placeholder={`Search in ${displayShopName}...`}
              buttonLabel="Find a drink"
              value={searchQuery}
              onSearch={handleSearch}
              onSelect={(productName) => {
                setSelectedCategory(null);
                setSelectedCollection(null);
                setSearchQuery(productName);
              }}
            />
          </div>

          {isLoading ? (
            <p role="status" className="text-center text-sm text-zinc-500">
              Loading {displayShopName}&apos;s menu...
            </p>
          ) : !shop && shopProducts.length === 0 ? (
            <section className="rounded-2xl border border-zinc-200 bg-white/90 p-8 text-center shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
              <Store className="mx-auto size-8 text-zinc-400" aria-hidden="true" />
              <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Shop not found
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                We couldn&apos;t find a shop matching &ldquo;{displayShopName}&rdquo;.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span>Back to all drinks</span>
              </Link>
            </section>
          ) : (
            <>
              {/* Shop Profile Header Card — matches ShopProfileCard & Storefront surfaces */}
              <section
                aria-label={`${displayShopName} profile`}
                className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 sm:p-6"
              >
                <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    <span>All shops &amp; drinks</span>
                  </Link>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
                    Shop Storefront
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {shop?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shop.logo_url}
                      alt={`${displayShopName} logo`}
                      className="size-20 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700 sm:size-24"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-20 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-2xl font-bold text-white dark:bg-zinc-100 dark:text-zinc-950 sm:size-24"
                    >
                      {shopInitials(displayShopName)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
                      {displayShopName}
                    </h1>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {shop?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-4 shrink-0" aria-hidden="true" />
                          {shop.location}
                        </span>
                      )}
                      <span>
                        {shopProducts.length} drink{shopProducts.length === 1 ? "" : "s"} available
                      </span>
                      {averageRating && (
                        <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                          <span className="font-medium">{averageRating}</span>
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleFollow}
                    aria-pressed={following}
                    className={
                      following
                        ? "inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        : "inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                    }
                  >
                    {following ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Plus className="size-4" aria-hidden="true" />
                    )}
                    {following ? "Following" : "Follow"}
                  </button>
                </div>

                {shop?.promotion && (
                  <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                    <Megaphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {shop.promotion}
                  </p>
                )}

                {shop?.bio && (
                  <p className="mt-4 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{shop.bio}</p>
                )}

                {shopCategories.length > 1 && (
                  <div
                    className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800/80"
                    role="tablist"
                    aria-label="Filter shop drinks by category"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!selectedCategory && !selectedCollection}
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedCollection(null);
                      }}
                      className={
                        !selectedCategory && !selectedCollection
                          ? "rounded-full bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-zinc-950"
                          : "rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }
                    >
                      All ({shopProducts.length})
                    </button>
                    {shopCategories.map((category) => {
                      const isActive = selectedCategory === category.name;
                      return (
                        <button
                          key={category.name}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => {
                            setSelectedCollection(null);
                            setSelectedCategory(isActive ? null : category.name);
                          }}
                          className={
                            isActive
                              ? "rounded-full bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-zinc-950"
                              : "rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:text-zinc-100"
                          }
                        >
                          {category.name} ({category.count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {catalogError && (
                <div role="alert" className="flex flex-wrap items-center justify-center gap-3 text-sm text-red-700">
                  <span>{catalogError}</span>
                  <button
                    type="button"
                    onClick={() => void refreshProducts()}
                    className="font-semibold underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              )}

              <ProductGrid
                showDoodleBackground={false}
                products={visibleProducts}
                onProductSelect={setActiveProduct}
                autoPlay={!activeProduct}
                eyebrow={selectedCollection ?? selectedCategory ?? "Shop menu"}
                title={
                  selectedCollection
                    ? `${selectedCollection} at ${displayShopName}`
                    : selectedCategory
                      ? `${selectedCategory} from ${displayShopName}`
                      : searchQuery
                        ? `Results for "${searchQuery}"`
                        : `Drinks from ${displayShopName}`
                }
                description={
                  visibleProducts.length === 0
                    ? "No drinks from this shop match your current filter."
                    : `${visibleProducts.length} drink${visibleProducts.length === 1 ? "" : "s"} available from ${displayShopName}.`
                }
              />
            </>
          )}
        </div>
      </main>

      <ProductDetailsDialog
        product={activeProduct}
        shop={shop}
        onClose={() => setActiveProduct(null)}
        onAddToCart={addItem}
      />
    </div>
  );
}

export default ShopLandingPage;
