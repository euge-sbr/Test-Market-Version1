"use client";

import { createContext, useCallback, useContext, useState, useMemo, useEffect, ReactNode } from "react";
import { fetchAvailableProducts } from "@/customers/api/products";
import type { Product } from "@/customers/data/products";
import {
  DEFAULT_DRINK_OPTIONS,
  getPearlPriceAdjustment,
  getSizePriceAdjustment,
  isDrinkSize,
  isIceLevel,
  isPearlOption,
  isSugarLevel,
  type DrinkOptions,
} from "@/customers/data/drink-options";

export interface CartItem extends DrinkOptions {
  lineId: string;
  id: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (productId: string) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  updateOptions: (lineId: string, options: Partial<DrinkOptions>) => void;
  clearCart: () => void;
  products: Product[];
  isCatalogLoading: boolean;
  catalogError: string;
  refreshProducts: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getCartVariantKey(item: CartItem): string {
  return JSON.stringify([item.id, item.size, item.sugarLevel, item.iceLevel, item.pearls]);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [isCartLoading, setIsCartLoading] = useState(true);

  const refreshProducts = useCallback(async () => {
    try {
      const catalog = await fetchAvailableProducts();
      const availableIds = new Set(catalog.map((product) => product.id));
      setProducts(catalog);
      setItems((current) => current.filter((item) => availableIds.has(item.id)));
      setCatalogError("");
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Could not load the drink menu.");
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    const firstLoadTimer = window.setTimeout(() => void refreshProducts(), 0);
    const refreshTimer = window.setInterval(() => void refreshProducts(), 30_000);
    const handleFocus = () => {
      if (document.visibilityState === "visible") void refreshProducts();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(firstLoadTimer);
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshProducts]);

  // Load cart from localStorage on initial render
  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        try {
          const parsedCart: unknown = JSON.parse(savedCart);
          const restoredItems = Array.isArray(parsedCart)
            ? parsedCart.flatMap((item): CartItem[] => {
                if (
                  !item ||
                  typeof item !== "object" ||
                  !("id" in item) ||
                  typeof item.id !== "string" ||
                  !("quantity" in item) ||
                  !Number.isInteger(item.quantity) ||
                  item.quantity <= 0
                ) {
                  return [];
                }

                return [{
                  lineId: "lineId" in item && typeof item.lineId === "string" && item.lineId.length > 0
                    ? item.lineId
                    : crypto.randomUUID(),
                  id: item.id,
                  quantity: item.quantity,
                  sugarLevel: isSugarLevel("sugarLevel" in item ? item.sugarLevel : undefined)
                    ? item.sugarLevel
                    : DEFAULT_DRINK_OPTIONS.sugarLevel,
                  iceLevel: isIceLevel("iceLevel" in item ? item.iceLevel : undefined)
                    ? item.iceLevel
                    : DEFAULT_DRINK_OPTIONS.iceLevel,
                  pearls: isPearlOption("pearls" in item ? item.pearls : undefined)
                    ? item.pearls
                    : DEFAULT_DRINK_OPTIONS.pearls,
                  size: isDrinkSize("size" in item ? item.size : undefined)
                    ? item.size
                    : DEFAULT_DRINK_OPTIONS.size,
                }];
              })
            : [];
          setItems((currentItems) => {
            const itemsByVariant = new Map<string, CartItem>();
            for (const item of restoredItems) {
              const variantKey = getCartVariantKey(item);
              const existing = itemsByVariant.get(variantKey);
              itemsByVariant.set(variantKey, {
                ...item,
                quantity: (existing?.quantity ?? 0) + item.quantity,
              });
            }
            for (const item of currentItems) {
              const variantKey = getCartVariantKey(item);
              const existing = itemsByVariant.get(variantKey);
              itemsByVariant.set(variantKey, {
                ...item,
                quantity: (existing?.quantity ?? 0) + item.quantity,
              });
            }
            return Array.from(itemsByVariant.values());
          });
        } catch (error) {
          console.error("Failed to parse cart from localStorage:", error);
          localStorage.removeItem("cart");
        }
      }
      setIsCartLoading(false);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isCartLoading) return;
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items, isCartLoading]);

  const addItem = (productId: string) => {
    setItems(prevItems => {
      const defaultItem: CartItem = {
        lineId: "",
        id: productId,
        quantity: 1,
        ...DEFAULT_DRINK_OPTIONS,
      };
      const variantKey = getCartVariantKey(defaultItem);
      const existingItem = prevItems.find(item => getCartVariantKey(item) === variantKey);
      if (existingItem) {
        return prevItems.map(item =>
          item.lineId === existingItem.lineId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { ...defaultItem, lineId: crypto.randomUUID() }];
      }
    });
  };

  const removeItem = (lineId: string) => {
    setItems(prevItems => prevItems.filter(item => item.lineId !== lineId));
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(lineId);
      return;
    }
    setItems(prevItems =>
      prevItems.map(item =>
        item.lineId === lineId ? { ...item, quantity } : item
      )
    );
  };

  const updateOptions = (lineId: string, options: Partial<DrinkOptions>) => {
    setItems((prevItems) =>
      prevItems.map((item) => item.lineId === lineId ? { ...item, ...options } : item),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalPrice = useMemo(() => {
    return items.reduce((total, item) => {
      const product = products.find(p => p.id === item.id);
      const unitPrice = product
        ? Number(product.price) + getPearlPriceAdjustment(item.pearls) + getSizePriceAdjustment(item.size)
        : 0;
      return total + unitPrice * item.quantity;
    }, 0);
  }, [items, products]);

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateOptions,
    clearCart,
    products,
    isCatalogLoading: isCatalogLoading || isCartLoading,
    catalogError,
    refreshProducts,
    totalItems,
    totalPrice
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}