import type { Product } from "@/customers/data/products";

export async function fetchAvailableProducts(): Promise<Product[]> {
  const response = await fetch("/api/products", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not load the drink menu.");
  return result.products as Product[];
}