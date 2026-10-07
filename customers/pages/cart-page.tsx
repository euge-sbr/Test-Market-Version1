"use client";

import { useCart } from "@/customers/state/cart-context";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { DRINK_SIZES, ICE_LEVELS, PEARL_OPTIONS, SUGAR_LEVELS, getPearlPriceAdjustment, getSizePriceAdjustment } from "@/customers/data/drink-options";

export default function CartPage() {
  const { items, products, totalItems, totalPrice, removeItem, updateQuantity, updateOptions, clearCart, isCatalogLoading, catalogError, refreshProducts } = useCart();

  if (isCatalogLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-black">Loading your cart...</main>;
  }

  if (catalogError && products.length === 0) {
    return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-black"><p role="alert" className="text-sm text-red-700">{catalogError}</p><button type="button" onClick={() => void refreshProducts()} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white">Retry</button></main>;
  }

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-zinc-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3 3m0 0l3-3m-3 3V8m0 0l3-3m-3 3v4m0 0H9a2 2 0 00-2 2v2a2 2 0 002 2h2" />
          </svg>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Your cart is empty</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            Looks like you haven&apos;t added any items to your cart yet.
          </p>
          <Link href="/" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Shopping Cart</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            You have {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart.
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm divide-y divide-zinc-200 dark:divide-neutral-700">
          {items.map((item) => {
            const product = products.find((p) => p.id === item.id);
            if (!product) return null;
            const unitPrice = product.price + getPearlPriceAdjustment(item.pearls) + getSizePriceAdjustment(item.size);

            return (
              <div key={item.lineId} className="flex items-start py-6 px-4 sm:px-6">
                {/* Product Image */}
                <div className="shrink-0 h-16 w-16">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-zinc-200 dark:bg-neutral-700 rounded-lg">
                      <span className="text-zinc-500 dark:text-zinc-400 text-sm">{product.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="ml-4 min-w-0 flex-1 space-y-3">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        {product.name}
                      </h3>
                      {product.shop_name && (
                        <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Sold by {product.shop_name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.lineId)}
                      className="p-1 rounded-hover text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">{product.description}</p>
                  <div className="flex items-baseline">
                    <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      ${unitPrice.toFixed(2)}
                    </span>
                    <span className="ml-4 text-zinc-500 dark:text-zinc-400">x</span>
                    <div className="ml-4 flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.lineId, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="p-1 rounded-hover text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                        className="p-1 rounded-hover text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Size
                      <select
                        value={item.size}
                        onChange={(event) => {
                          const size = DRINK_SIZES.find((option) => option.value === event.currentTarget.value)?.value;
                          if (size) updateOptions(item.lineId, { size });
                        }}
                        className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-zinc-100"
                      >
                        {DRINK_SIZES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Sugar Level
                      <select
                        value={item.sugarLevel}
                        onChange={(event) => {
                          const sugarLevel = SUGAR_LEVELS.find((option) => option.value === event.currentTarget.value)?.value;
                          if (sugarLevel) updateOptions(item.lineId, { sugarLevel });
                        }}
                        className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-zinc-100"
                      >
                        {SUGAR_LEVELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Ice Level
                      <select
                        value={item.iceLevel}
                        onChange={(event) => {
                          const iceLevel = ICE_LEVELS.find((option) => option.value === event.currentTarget.value)?.value;
                          if (iceLevel) updateOptions(item.lineId, { iceLevel });
                        }}
                        className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-zinc-100"
                      >
                        {ICE_LEVELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Tapioca / Pearls
                      <select
                        value={item.pearls}
                        onChange={(event) => {
                          const pearls = PEARL_OPTIONS.find((option) => option.value === event.currentTarget.value)?.value;
                          if (pearls) updateOptions(item.lineId, { pearls });
                        }}
                        className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-zinc-100"
                      >
                        {PEARL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Summary */}
        {totalItems > 0 && (
          <div className="mt-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between pt-5 pb-4 border-t border-zinc-200 dark:border-neutral-700">
                <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Subtotal</span>
                <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-4 pb-6">
                <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  Total ({totalItems} item{totalItems !== 1 ? "s" : ""})
                </span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="mt-8 space-x-3">
              <button
                onClick={clearCart}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 rounded-md"
              >
                Clear Cart
              </button>
              <Link
                href="/"
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Continue Shopping
              </Link>
              <Link
                href="/checkout"
                className="flex-1 px-4 py-2 text-center text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}