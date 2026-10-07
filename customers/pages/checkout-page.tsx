"use client";

import Link from "next/link";
import { Check, CreditCard, MapPin, ShoppingBag, Truck } from "lucide-react";
import { type FormEvent, useState } from "react";

import { getPearlPriceAdjustment, getSizePriceAdjustment } from "@/customers/data/drink-options";
import { useCart } from "@/customers/state/cart-context";

const inputClassName =
  "mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

type CreatedOrder = {
  orderNumber: string;
  shopName: string;
  trackingToken: string;
};

function isCreatedOrder(value: unknown): value is CreatedOrder {
  if (!value || typeof value !== "object") return false;
  return "orderNumber" in value && typeof value.orderNumber === "string"
    && "shopName" in value && typeof value.shopName === "string"
    && "trackingToken" in value && typeof value.trackingToken === "string";
}

export default function CheckoutPage() {
  const { items, products, totalItems, totalPrice, clearCart, isCatalogLoading, catalogError, refreshProducts } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<CreatedOrder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: formData.get("name"),
            email: formData.get("email"),
            phone: formData.get("phone"),
          },
          delivery: {
            address: formData.get("address"),
            city: formData.get("city"),
            postalCode: formData.get("postalCode"),
            note: formData.get("note"),
          },
          paymentMethod,
          items,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrorMessage(result.error ?? "We could not place your order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (!Array.isArray(result.orders) || result.orders.length === 0 || !result.orders.every(isCreatedOrder)) {
        setErrorMessage("Your order was placed, but tracking details could not be loaded. Please contact support with your checkout confirmation.");
        return;
      }
      setCreatedOrders(result.orders);
      try {
        sessionStorage.setItem(
          "pearlpour-order-tracking",
          JSON.stringify(result.orders.map((order: CreatedOrder) => order.trackingToken)),
        );
      } catch (error) {
        console.error("Could not save order tracking codes:", error);
      }
      clearCart();
      setIsSubmitted(true);
    } catch {
      setErrorMessage("We could not reach the order service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
        <section className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm dark:bg-neutral-900">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
            <Check className="size-7" aria-hidden="true" />
          </div>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Order received</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-950 dark:text-zinc-50">Your order is waiting for the shop</h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Track each shop’s progress below. This page updates as your order status changes.
          </p>
          <div className="mt-6 space-y-3 text-left">
            {createdOrders.map((order) => (
              <div key={order.orderNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">{order.shopName}</p>
                  <p className="mt-1 text-xs text-zinc-500">Order {order.orderNumber} · Waiting for confirmation</p>
                </div>
                <Link href={`/orders/track#${order.trackingToken}`} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700">
                  Track order
                </Link>
              </div>
            ))}
          </div>
          <Link href="/" className="mt-6 inline-flex rounded-md border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
            Continue shopping
          </Link>
        </section>
      </main>
    );
  }

  if (isCatalogLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-black">Loading your order...</main>;
  }

  if (catalogError && products.length === 0) {
    return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-black"><p role="alert" className="text-sm text-red-700">{catalogError}</p><button type="button" onClick={() => void refreshProducts()} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white">Retry menu</button></main>;
  }

  if (totalItems === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
        <section className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm dark:bg-neutral-900">
          <ShoppingBag className="mx-auto size-10 text-zinc-400" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-bold text-zinc-950 dark:text-zinc-50">Your cart is empty</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Add a drink before heading to checkout.</p>
          <Link href="/" className="mt-6 inline-flex rounded-md bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-700">
            Browse drinks
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <Link href="/cart" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Back to cart</Link>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Pearl & Pour</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Checkout</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">A few details and we&apos;ll get your order ready.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">1</div>
                <div>
                  <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">Contact details</h2>
                  <p className="text-sm text-zinc-500">We&apos;ll send your receipt here.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Full name<input name="name" required autoComplete="name" className={inputClassName} placeholder="Alex Morgan" /></label>
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Email address<input name="email" type="email" required autoComplete="email" className={inputClassName} placeholder="alex@example.com" /></label>
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">Phone number<input name="phone" type="tel" required autoComplete="tel" className={inputClassName} placeholder="(555) 123-4567" /></label>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">2</div>
                <div>
                  <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">Delivery details</h2>
                  <p className="text-sm text-zinc-500">Where should we bring your order?</p>
                </div>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">Street address<input name="address" required autoComplete="street-address" className={inputClassName} placeholder="123 Market Street" /></label>
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">City<input name="city" required autoComplete="address-level2" className={inputClassName} placeholder="San Francisco" /></label>
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Postal code<input name="postalCode" required autoComplete="postal-code" className={inputClassName} placeholder="94105" /></label>
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">Delivery note <span className="font-normal text-zinc-500">(optional)</span><textarea name="note" rows={3} className={inputClassName} placeholder="Leave at the front desk..." /></label>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">3</div>
                <div>
                  <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">Payment method</h2>
                  <p className="text-sm text-zinc-500">Choose how you&apos;d like to pay.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <label className={`cursor-pointer rounded-lg border p-4 transition ${paymentMethod === "card" ? "border-indigo-600 ring-2 ring-indigo-600/10" : "border-zinc-200 dark:border-zinc-700"}`}>
                  <input type="radio" name="payment" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} className="sr-only" />
                  <span className="flex items-center gap-3"><CreditCard className="size-5 text-indigo-600" aria-hidden="true" /><span><span className="block text-sm font-medium">Card</span><span className="block text-xs text-zinc-500">Secure payment</span></span></span>
                </label>
                <label className={`cursor-pointer rounded-lg border p-4 transition ${paymentMethod === "cash" ? "border-indigo-600 ring-2 ring-indigo-600/10" : "border-zinc-200 dark:border-zinc-700"}`}>
                  <input type="radio" name="payment" value="cash" checked={paymentMethod === "cash"} onChange={() => setPaymentMethod("cash")} className="sr-only" />
                  <span className="flex items-center gap-3"><Truck className="size-5 text-indigo-600" aria-hidden="true" /><span><span className="block text-sm font-medium">Cash on delivery</span><span className="block text-xs text-zinc-500">Pay when it arrives</span></span></span>
                </label>
              </div>
              {paymentMethod === "card" && <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-950">Card processing will be connected when payments are enabled.</p>}
            </section>
          </div>

          <aside className="h-fit rounded-xl bg-zinc-950 p-6 text-white shadow-sm dark:bg-white dark:text-zinc-950">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-6 space-y-4">
              {items.map((item) => {
                const product = products.find((entry) => entry.id === item.id);
                if (!product) return null;
                const unitPrice = product.price + getPearlPriceAdjustment(item.pearls) + getSizePriceAdjustment(item.size);
                return <div key={item.lineId} className="flex justify-between gap-4 text-sm"><span className="text-zinc-300 dark:text-zinc-600">{item.quantity} x {product.name}{product.shop_name && <span className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500">Sold by {product.shop_name}</span>}<span className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500">{item.size} · {item.sugarLevel} · {item.iceLevel} · {item.pearls}</span></span><span>${(unitPrice * item.quantity).toFixed(2)}</span></div>;
              })}
            </div>
            <div className="my-6 border-t border-white/15 dark:border-zinc-200" />
            <div className="flex justify-between text-sm text-zinc-300 dark:text-zinc-600"><span>Subtotal</span><span>${totalPrice.toFixed(2)}</span></div>
            <div className="mt-3 flex justify-between text-sm text-zinc-300 dark:text-zinc-600"><span>Delivery</span><span>Free</span></div>
            <div className="mt-5 flex justify-between text-lg font-semibold"><span>Total</span><span>${totalPrice.toFixed(2)}</span></div>
            <button type="submit" disabled={isSubmitting} className="mt-7 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-wait disabled:opacity-60 dark:focus:ring-offset-white">
              <MapPin className="size-4" aria-hidden="true" /> {isSubmitting ? "Saving order..." : "Confirm order"}
            </button>
            {errorMessage && <p role="alert" className="mt-3 text-center text-sm text-red-300">{errorMessage}</p>}
            <p className="mt-4 text-center text-xs text-zinc-400">No payment is charged in this demo checkout.</p>
          </aside>
        </form>
      </div>
    </main>
  );
}
