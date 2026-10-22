"use client";

import { useEffect, useState } from "react";

import type { PublicShop } from "@/customers/components/ui/shop-profile-card";

export function useShops() {
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadShops() {
      try {
        const response = await fetch("/api/shops", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled && Array.isArray(result.shops)) setShops(result.shops as PublicShop[]);
      } catch (error) {
        console.error("Could not load shop profiles:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadShops();
    return () => {
      cancelled = true;
    };
  }, []);

  return { shops, isLoading };
}
