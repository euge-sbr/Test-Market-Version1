"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clock3, CreditCard, LoaderCircle, PackageCheck, ShoppingBag, Store, X, XCircle } from "lucide-react";

import { StorefrontAmbientBackground } from "@/customers/components/ui/storefront-ambient-background";
import { useCart } from "@/customers/state/cart-context";

type TrackedOrderItem = {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

type TrackedOrder = {
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  total: number;
  createdAt: string;
  shopName: string;
  items?: TrackedOrderItem[];
};

const TRACKING_STORAGE_KEY = "pearlpour-order-tracking";
const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const inputClassName =
  "w-full rounded-xl border border-stone-200/90 bg-white/90 px-3.5 py-2.5 text-sm text-stone-900 shadow-2xs outline-none transition focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-neutral-950/80 dark:text-stone-100 dark:focus:border-amber-400";

const frostedPillLinkClassName =
  "inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-stone-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10 dark:hover:text-white";

function readTrackingTokens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (token): token is string => typeof token === "string" && TRACKING_TOKEN_PATTERN.test(token),
  ))].slice(0, 50);
}

function parseProductNameAndOptions(fullName: string): { name: string; options: string | null } {
  const match = fullName.match(/^(.*)\s+\(([^()]+)\)$/);
  if (!match) return { name: fullName, options: null };
  return { name: match[1], options: match[2] };
}

function statusLabel(status: string, paymentStatus?: string) {
  if (paymentStatus === "expired") return "Payment expired · Cancelled";
  if (paymentStatus === "awaiting_payment") return "Awaiting card payment";
  switch (status) {
    case "confirmed": return "Order confirmed";
    case "preparing": return "Preparing your order";
    case "delivered": return "Delivered";
    case "cancelled": return "Cancelled";
    default: return "Waiting for the shop";
  }
}

function statusStep(status: string, paymentStatus?: string) {
  if (status === "cancelled" || paymentStatus === "expired") return -1;
  if (paymentStatus === "awaiting_payment") return 0;
  if (status === "delivered") return 3;
  if (status === "preparing") return 2;
  if (status === "confirmed") return 1;
  return 0;
}

export default function TrackOrdersPage() {
  const { clearCart, products, totalItems } = useCart();
  const [trackingTokens, setTrackingTokens] = useState<string[]>([]);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogCloseButtonRef = useRef<HTMLButtonElement>(null);

  const selectedOrder = orders.find((order) => order.orderNumber === selectedOrderNumber) ?? null;

  useEffect(() => {
    if (!selectedOrderNumber) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialogCloseButtonRef.current?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedOrderNumber(null);
      } else if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements.item(0);
        const lastElement = focusableElements.item(focusableElements.length - 1);
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleDialogKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [selectedOrderNumber]);

  const refreshOrders = useCallback(async (tokens: string[], background = false) => {
    if (tokens.length === 0) return;
    if (background) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ trackingTokens: tokens }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrorMessage(result.error ?? "We couldn’t load your order updates.");
        return;
      }
      setOrders(result.orders as TrackedOrder[]);
    } catch {
      setErrorMessage("We couldn’t reach order tracking. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const isPaymentSuccess = searchParams.get("payment") === "success";
      if (isPaymentSuccess) {
        clearCart();
        setPaymentSucceeded(true);
        searchParams.delete("payment");
      }

      const hashTokens = window.location.hash.slice(1).split(",");
      let savedTokens: string[] = [];
      try {
        const localRaw = localStorage.getItem(TRACKING_STORAGE_KEY);
        const sessionRaw = sessionStorage.getItem(TRACKING_STORAGE_KEY);
        const parsedLocal: unknown = JSON.parse(localRaw ?? "[]");
        const parsedSession: unknown = JSON.parse(sessionRaw ?? "[]");
        savedTokens = readTrackingTokens([
          ...(Array.isArray(parsedLocal) ? parsedLocal : []),
          ...(Array.isArray(parsedSession) ? parsedSession : []),
        ]);
        const validHashTokens = hashTokens.filter((token) => TRACKING_TOKEN_PATTERN.test(token));
        if (validHashTokens.length > 0 || sessionRaw) {
          savedTokens = readTrackingTokens([...validHashTokens, ...savedTokens]);
          localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(savedTokens));
          sessionStorage.removeItem(TRACKING_STORAGE_KEY);
        }
        if (validHashTokens.length > 0 || isPaymentSuccess) {
          const nextSearch = searchParams.toString();
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`,
          );
        }
      } catch (error) {
        console.error("Could not restore order tracking codes:", error);
        setErrorMessage("Your saved tracking codes could not be loaded. Enter a tracking code below.");
      }
      setTrackingTokens(savedTokens);
      if (savedTokens.length > 0) void refreshOrders(savedTokens);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [clearCart, refreshOrders]);

  useEffect(() => {
    if (trackingTokens.length === 0) return;
    const timer = window.setInterval(() => void refreshOrders(trackingTokens, true), 15_000);
    return () => window.clearInterval(timer);
  }, [refreshOrders, trackingTokens]);

  function addTrackingCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = trackingCode.trim();
    if (!TRACKING_TOKEN_PATTERN.test(token)) {
      setErrorMessage("That tracking code doesn’t look valid.");
      return;
    }

    const nextTokens = readTrackingTokens([...trackingTokens, token]);
    setTrackingTokens(nextTokens);
    setTrackingCode("");
    setErrorMessage("");
    try {
      localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(nextTokens));
    } catch (error) {
      console.error("Could not save order tracking code:", error);
      setErrorMessage("We couldn’t save that code in this browser. Keep the code to track this order later.");
    }
    void refreshOrders(nextTokens);
  }

  return (
    <div className="relative min-h-screen">
      <StorefrontAmbientBackground />

      <main className="relative z-10 min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className={frostedPillLinkClassName}>
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>Continue shopping</span>
            </Link>
            <Link href="/cart" className={frostedPillLinkClassName}>
              <ShoppingBag className="size-3.5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
              <span>Cart{totalItems > 0 ? ` (${totalItems})` : ""}</span>
            </Link>
          </div>

          <header className="mb-8 mt-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-900/10 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-900/80 shadow-2xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-amber-200/80">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Cavitea &amp; Pastry
            </p>
            <h1 className="storefront-gradient-text mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Track your orders
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400 sm:text-base">
              See when each shop confirms, prepares, and completes your order.
            </p>
          </header>

          {paymentSucceeded && (
            <div
              role="status"
              className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-300/70 bg-emerald-50/90 px-4 py-3.5 text-sm font-medium text-emerald-900 shadow-xs backdrop-blur-md dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-200"
            >
              <CreditCard className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Payment received! Your order has been sent to the shop.</span>
            </div>
          )}

          <form
            onSubmit={addTrackingCode}
            className="mb-6 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.38)] backdrop-blur-md dark:border-neutral-700/70 dark:bg-neutral-900/80 sm:p-6"
          >
            <label className="block text-sm font-semibold text-stone-900 dark:text-stone-100" htmlFor="tracking-code">
              {trackingTokens.length === 0 ? "Tracking code" : "Track another order"}
            </label>
            <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400 sm:text-sm">
              Use the private code from your order confirmation or tracking link. Keep the link private.
            </p>
            <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
              <input
                id="tracking-code"
                value={trackingCode}
                onChange={(event) => setTrackingCode(event.target.value)}
                className={inputClassName}
                placeholder="Paste your tracking code"
                autoComplete="off"
                required
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-stone-50 dark:text-stone-950 dark:hover:bg-stone-200"
              >
                Find order
              </button>
            </div>
          </form>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-700 backdrop-blur-md dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
            >
              {errorMessage}
              {trackingTokens.length > 0 && (
                <button
                  type="button"
                  onClick={() => void refreshOrders(trackingTokens)}
                  className="ml-2 font-semibold underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {isLoading && orders.length === 0 && (
            <p role="status" className="flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-400">
              <LoaderCircle className="size-4 animate-spin text-amber-700 dark:text-amber-300" aria-hidden="true" />
              <span>Loading your orders...</span>
            </p>
          )}

          {orders.length > 0 && (
            <section aria-label="Order progress" className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-semibold text-stone-950 dark:text-stone-50">Your orders</h2>
                <span role="status" className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {isRefreshing ? "Updating..." : "Click an order to view items"}
                </span>
              </div>
              {orders.map((order) => {
                const currentStep = statusStep(order.status, order.paymentStatus);
                const isCancelled = order.status === "cancelled" || order.paymentStatus === "expired";
                const isDelivered = order.status === "delivered" && !isCancelled;
                const steps = ["Received", "Confirmed", "Preparing", "Delivered"];
                return (
                  <article
                    key={order.orderNumber}
                    role="button"
                    tabIndex={0}
                    aria-label={`View items for order ${order.orderNumber} from ${order.shopName}`}
                    onClick={() => setSelectedOrderNumber(order.orderNumber)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedOrderNumber(order.orderNumber);
                      }
                    }}
                    className="cursor-pointer rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.38)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-neutral-700/70 dark:bg-neutral-900/80 dark:hover:border-amber-400/35 sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          Order {order.orderNumber}
                        </p>
                        <h3 className="mt-1 flex items-center gap-2 text-lg font-bold tracking-tight text-stone-950 dark:text-stone-50">
                          <Store className="size-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                          <span>{order.shopName}</span>
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-stone-950 dark:text-stone-50">
                          ${order.total.toFixed(2)}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        isCancelled
                          ? "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300"
                          : isDelivered
                            ? "bg-emerald-500/12 text-emerald-800 dark:bg-emerald-400/12 dark:text-emerald-300"
                            : "bg-amber-500/12 text-amber-900 dark:bg-amber-400/12 dark:text-amber-200"
                      }`}
                    >
                      {isCancelled ? (
                        <XCircle className="size-3.5" aria-hidden="true" />
                      ) : isDelivered ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Clock3 className="size-3.5" aria-hidden="true" />
                      )}
                      {statusLabel(order.status, order.paymentStatus)}
                    </div>

                    {isCancelled ? (
                      <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
                        Please contact the shop if you need help with this order.
                      </p>
                    ) : (
                      <ol aria-label="Order status" className="mt-5 grid grid-cols-4 gap-2">
                        {steps.map((step, index) => {
                          const complete = index <= currentStep;
                          return (
                            <li key={step} className="min-w-0">
                              <div
                                className={`h-1.5 rounded-full transition-colors ${
                                  complete
                                    ? isDelivered
                                      ? "bg-emerald-600 dark:bg-emerald-400"
                                      : "bg-amber-600 dark:bg-amber-400"
                                    : "bg-stone-200/90 dark:bg-neutral-700"
                                }`}
                              />
                              <span
                                className={`mt-2 block truncate text-[11px] ${
                                  complete
                                    ? "font-semibold text-stone-800 dark:text-stone-200"
                                    : "text-stone-400 dark:text-stone-500"
                                }`}
                              >
                                {step}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {trackingTokens.length > 0 && orders.length === 0 && !isLoading && !errorMessage && (
            <div className="rounded-2xl border border-white/80 bg-white/85 p-7 text-center shadow-sm backdrop-blur-md dark:border-neutral-700/70 dark:bg-neutral-900/80">
              <PackageCheck className="mx-auto size-8 text-amber-700/70 dark:text-amber-300/70" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-stone-600 dark:text-stone-400">
                No order updates are available yet.
              </p>
            </div>
          )}
        </div>

        {selectedOrder && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/55 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedOrderNumber(null);
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-dialog-title"
              tabIndex={-1}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/80 bg-[#fdf8f1]/95 p-6 shadow-2xl backdrop-blur-xl outline-none dark:border-white/10 dark:bg-stone-950/95 sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-amber-900/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900/80 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-amber-200/80">
                    <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    Cavitea &amp; Pastry · Order {selectedOrder.orderNumber}
                  </p>
                  <h2
                    id="order-dialog-title"
                    className="storefront-gradient-text mt-3 text-2xl font-bold tracking-tight"
                  >
                    {selectedOrder.shopName}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {new Date(selectedOrder.createdAt).toLocaleString()} ·{" "}
                    {statusLabel(selectedOrder.status, selectedOrder.paymentStatus)}
                  </p>
                </div>
                <button
                  ref={dialogCloseButtonRef}
                  type="button"
                  onClick={() => setSelectedOrderNumber(null)}
                  aria-label={`Close order ${selectedOrder.orderNumber} dialog`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/75 text-stone-600 shadow-2xs transition hover:bg-white hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <ul className="divide-y divide-stone-200/80 dark:divide-white/10">
                    {selectedOrder.items.map((item) => {
                      const { name, options } = parseProductNameAndOptions(item.productName);
                      const matchedProduct =
                        (item.productId && products.find((entry) => entry.id === item.productId)) ||
                        products.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
                      return (
                        <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                          <div className="flex min-w-0 items-center gap-3">
                            {matchedProduct?.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={matchedProduct.image}
                                alt=""
                                aria-hidden="true"
                                className="size-11 shrink-0 rounded-xl border border-white/80 bg-stone-100 object-cover shadow-2xs dark:border-white/10 dark:bg-neutral-900"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-stone-950 dark:text-stone-50">
                                {item.quantity} × {name}
                              </p>
                              {options && (
                                <p className="mt-0.5 text-xs leading-5 text-stone-600 dark:text-stone-400">
                                  {options.split(", ").join(" · ")}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-stone-950 dark:text-stone-50">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
                    No item details are available for this order.
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-stone-200/80 pt-4 text-base font-bold text-stone-950 dark:border-white/10 dark:text-stone-50">
                  <span>Total</span>
                  <span>${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
