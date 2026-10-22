"use client";

import { useMemo, useSyncExternalStore } from "react";

// One random seed per page load. Client-side navigation (cart, product dialog, back to the
// storefront) keeps the same order, while a fresh visit or a refresh reshuffles, so no shop
// is permanently first just because it posted its products earliest.
let pageLoadSeed: string | null = null;

function getSeed() {
  if (pageLoadSeed === null) {
    pageLoadSeed = Math.floor(Math.random() * 0x100000000).toString(36);
  }
  return pageLoadSeed;
}

// The server render (and hydration) uses the catalog order; the shuffle applies right after.
function getServerSeed() {
  return null;
}

function subscribe() {
  return () => {};
}

// FNV-1a with a murmur-style finalizer: a fast, well-mixed 32-bit hash.
function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/**
 * Deterministically shuffles items for a given seed. The same seed always gives the same
 * order, and refreshing the catalog (or adding a product) does not reshuffle everything.
 */
export function shuffleWithSeed<T>(items: readonly T[], seed: string, keyOf: (item: T) => string): T[] {
  return items
    .map((item) => ({ item, key: keyOf(item), rank: hashString(`${seed}:${keyOf(item)}`) }))
    .sort((first, second) => first.rank - second.rank || first.key.localeCompare(second.key))
    .map(({ item }) => item);
}

/** Returns the products in a fair, per-visit random order. */
export function useShuffledProducts<T extends { id: string }>(products: readonly T[]): T[] {
  const seed = useSyncExternalStore(subscribe, getSeed, getServerSeed);
  return useMemo(
    () => (seed ? shuffleWithSeed(products, seed, (product) => product.id) : [...products]),
    [products, seed],
  );
}
