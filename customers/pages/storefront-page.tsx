"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductDetailsDialog } from "@/customers/components/ui/product-details-dialog";
import { GooeySearch } from "@/customers/components/ui/gooey-search";
import { MegaMenuNavbar } from "@/customers/components/ui/mega-menu-navbar";
import { ProductGrid } from "@/customers/components/ui/product-grid";
import { ShopProfileCard } from "@/customers/components/ui/shop-profile-card";
import { StorefrontAmbientBackground } from "@/customers/components/ui/storefront-ambient-background";
import { FlavorTicker, StorefrontStats } from "@/customers/components/ui/storefront-hero-highlights";
import { StorefrontSplash } from "@/customers/components/ui/storefront-splash";
import type { Product } from "@/customers/data/products"; 
import { collections, drinkCategories } from "@/customers/data/storefront-navigation";
import { useShops } from "@/customers/hooks/use-shops";
import { useShuffledProducts } from "@/customers/hooks/use-shuffled-products";
import { useCart } from "@/customers/state/cart-context";


function shopNameOf(product: Product) {
  return (product.shop_name ?? "").trim().toLowerCase();
}

export default function Home() {
  const { products: catalogProducts, isCatalogLoading, catalogError, refreshProducts, addItem } = useCart();
  // Shuffle once per visit so every shop gets a fair spot, instead of the earliest poster always being first.
  // "Best Sellers" and "New This Week" re-sort this list explicitly below.
  const products = useShuffledProducts(catalogProducts);
  const { shops } = useShops();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
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

    const needle = query.trim().toLowerCase();
    const shopMatches = shops
      .filter((shop) => shop.name.toLowerCase().includes(needle))
      .map((shop) => ({
        label: shop.name,
        subtitle: shop.location ? `Shop · ${shop.location}` : "Shop",
        imageUrl: shop.logo_url,
        kind: "shop" as const,
      }));
    const productMatches = products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(needle) ||
          product.description.toLowerCase().includes(needle) ||
          product.category.toLowerCase().includes(needle) ||
          shopNameOf(product).includes(needle),
      )
      .map((product) => ({
        label: product.name,
        subtitle: product.shop_name
          ? `${product.shop_name} · $${product.price.toFixed(2)}`
          : `$${product.price.toFixed(2)}`,
        imageUrl: product.image,
        kind: "product" as const,
      }));

    return [...shopMatches, ...productMatches];
  }, [products, shops]);

  // A shop is "matched" when the search text is exactly its name (or its slug),
  // for example after typing it, picking it from the suggestions, or opening #boba-lab.
  const matchedShop = useMemo(() => {
    if (selectedCategory || selectedCollection) return null;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    return (
      shops.find(
        (shop) => shop.name.trim().toLowerCase() === query || shop.slug.replaceAll("-", " ") === query,
      ) ?? null
    );
  }, [shops, searchQuery, selectedCategory, selectedCollection]);

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
          product.category.toLowerCase() === category ||
          product.name.toLowerCase().includes(category) ||
          product.description.toLowerCase().includes(category),
      );
    }

    if (matchedShop) {
  const shopName = matchedShop.name.trim().toLowerCase();
  return products.filter((product) => shopNameOf(product) === shopName);
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
      product.category.toLowerCase().includes(query) ||
      shopNameOf(product).includes(query),
  );
}, [products, searchQuery, selectedCategory, selectedCollection, matchedShop]);

  const activeShopName = (activeProduct?.shop_name ?? "").trim().toLowerCase();
  const activeShop = activeShopName
    ? shops.find((shop) => shop.name.trim().toLowerCase() === activeShopName) ?? null
    : null;

  // The plain homepage (no search, category, collection or shop) gets the lively hero extras.
  const isDefaultView = !matchedShop && !selectedCategory && !selectedCollection && !searchQuery.trim();
  const storefrontStats = useMemo(() => ({
    drinkCount: products.length,
    shopCount: new Set(products.map(shopNameOf).filter(Boolean)).size,
    newCount: products.filter((product) => product.is_new_this_week).length,
    hasBestSellers: products.some((product) => product.best_seller_rank !== null),
  }), [products]);

  return (
    <div className="relative min-h-screen">
      <StorefrontAmbientBackground />
      <StorefrontSplash />
      <MegaMenuNavbar
        brandName="Cavitea & Pastry"
        accountHref="/orders/track"
        accountLabel="Track orders"
        categories={drinkCategories}
        collections={collections}
        onDesktopOpenChange={setDesktopSidebarOpen}
      />
      <main className={`relative isolate min-h-screen px-4 py-10 lg:pr-12 ${desktopSidebarOpen ? "lg:pl-84" : "lg:pl-16"}`}>
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10">
          <div className="flex justify-center">
            <GooeySearch
              placeholder="Search drinks or shops..."
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
          {isCatalogLoading && <p role="status" className="text-center text-sm text-zinc-500">Loading today&apos;s drinks...</p>}
          {catalogError && <div role="alert" className="flex flex-wrap items-center justify-center gap-3 text-sm text-red-700"><span>{catalogError}</span><button type="button" onClick={() => void refreshProducts()} className="font-semibold underline underline-offset-2">Try again</button></div>}
          {!isCatalogLoading && !catalogError && products.length === 0 && <p className="text-center text-sm text-zinc-600">No drinks are available right now.</p>}
          {!isCatalogLoading && !catalogError && selectedCollection && visibleProducts.length === 0 && <p className="text-center text-sm text-zinc-600">{selectedCollection === "Best Sellers" ? "No drinks have been ordered yet." : "No new drinks have been posted this week."}</p>}

          {matchedShop && <ShopProfileCard shop={matchedShop} productCount={visibleProducts.length} />}
          <ProductGrid
            showDoodleBackground={false}
            products={visibleProducts}
            onProductSelect={setActiveProduct}
            autoPlay={!activeProduct}
            eyebrow={matchedShop ? "Shop menu" : selectedCollection ?? "Freshly shaken"}
            title={matchedShop
              ? `Drinks from ${matchedShop.name}`
              : selectedCollection ?? (searchQuery ? `Results for "${searchQuery}"` : "Your next favorite cup")}
            description={matchedShop
              ? `${visibleProducts.length} drink${visibleProducts.length === 1 ? "" : "s"} available from this shop.`
              : selectedCollection === "Best Sellers"
                ? "Customer favorites, ordered by the number of drinks sold."
                : selectedCollection === "New This Week"
                  ? "The newest drinks posted by our clients in the last seven days."
                  : searchQuery
                    ? `${visibleProducts.length} drink${visibleProducts.length === 1 ? "" : "s"} match your search.`
                    : "Small-batch milk teas and signature boba drinks, made to order."}
            headerExtra={isDefaultView ? (
              <div className="flex flex-col items-center gap-4">
                <FlavorTicker />
                <StorefrontStats {...storefrontStats} />
              </div>
            ) : undefined}
          />
        </div>
      </main>
       <ProductDetailsDialog
        product={activeProduct}
        shop={activeShop}
        onClose={() => setActiveProduct(null)}
        onAddToCart={addItem}
      />
    </div>
  );
}
