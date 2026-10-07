"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Clock3, LoaderCircle, PackageCheck, Store, XCircle } from "lucide-react";

type TrackedOrder = {
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  shopName: string;
};

const TRACKING_STORAGE_KEY = "pearlpour-order-tracking";
const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const inputClassName =
  "mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

function readTrackingTokens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (token): token is string => typeof token === "string" && TRACKING_TOKEN_PATTERN.test(token),
  ))].slice(0, 50);
}

function statusLabel(status: string) {
  switch (status) {
    case "confirmed": return "Order confirmed";
    case "preparing": return "Preparing your order";
    case "delivered": return "Delivered";
    case "cancelled": return "Cancelled";
    default: return "Waiting for the shop";
  }
}

function statusStep(status: string) {
  if (status === "cancelled") return -1;
  if (status === "delivered") return 3;
  if (status === "preparing") return 2;
  if (status === "confirmed") return 1;
  return 0;
}

export default function TrackOrdersPage() {
  const [trackingTokens, setTrackingTokens] = useState<string[]>([]);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
      const hashTokens = window.location.hash.slice(1).split(",");
      let savedTokens: string[] = [];
      try {
        const parsed: unknown = JSON.parse(sessionStorage.getItem(TRACKING_STORAGE_KEY) ?? "[]");
        savedTokens = readTrackingTokens(parsed);
        const validHashTokens = hashTokens.filter((token) => TRACKING_TOKEN_PATTERN.test(token));
        if (validHashTokens.length > 0) {
          savedTokens = readTrackingTokens([...savedTokens, ...validHashTokens]);
          sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(savedTokens));
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
      } catch (error) {
        console.error("Could not restore order tracking codes:", error);
        setErrorMessage("Your saved tracking codes could not be loaded. Enter a tracking code below.");
      }
      setTrackingTokens(savedTokens);
      if (savedTokens.length > 0) void refreshOrders(savedTokens);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshOrders]);

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
      sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(nextTokens));
    } catch (error) {
      console.error("Could not save order tracking code:", error);
      setErrorMessage("We couldn’t save that code in this browser. Keep the code to track this order later.");
    }
    void refreshOrders(nextTokens);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 dark:bg-black sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">← Continue shopping</Link>
        <header className="mb-8 mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Pearl &amp; Pour</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Track your orders</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">See when each shop confirms, prepares, and completes your order.</p>
        </header>

        <form onSubmit={addTrackingCode} className="mb-6 rounded-xl bg-white p-5 shadow-sm dark:bg-neutral-900">
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="tracking-code">
            {trackingTokens.length === 0 ? "Tracking code" : "Track another order"}
          </label>
          <p className="mt-1 text-sm text-zinc-500">Use the private code from your order confirmation or tracking link. Keep the link private.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="tracking-code"
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              className={inputClassName}
              placeholder="Paste your tracking code"
              autoComplete="off"
              required
            />
            <button type="submit" className="shrink-0 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
              Find order
            </button>
          </div>
        </form>

        {errorMessage && (
          <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
            {trackingTokens.length > 0 && (
              <button type="button" onClick={() => void refreshOrders(trackingTokens)} className="ml-2 font-semibold underline">
                Retry
              </button>
            )}
          </div>
        )}

        {isLoading && orders.length === 0 && (
          <p role="status" className="flex items-center gap-2 text-sm text-zinc-500">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Loading your orders...
          </p>
        )}

        {orders.length > 0 && (
          <section aria-label="Order progress" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">Your orders</h2>
              <span role="status" className="text-xs text-zinc-500">
                {isRefreshing ? "Updating..." : "Updates automatically"}
              </span>
            </div>
            {orders.map((order) => {
              const currentStep = statusStep(order.status);
              const steps = ["Received", "Confirmed", "Preparing", "Delivered"];
              return (
                <article key={order.orderNumber} className="rounded-xl bg-white p-5 shadow-sm dark:bg-neutral-900 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Order {order.orderNumber}</p>
                      <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                        <Store className="size-4 text-indigo-600" aria-hidden="true" /> {order.shopName}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-zinc-950 dark:text-zinc-50">${order.total.toFixed(2)}</p>
                      <p className="mt-1 text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className={`mt-5 flex items-center gap-2 text-sm font-semibold ${order.status === "cancelled" ? "text-red-700 dark:text-red-400" : "text-indigo-700 dark:text-indigo-400"}`}>
                    {order.status === "cancelled"
                      ? <XCircle className="size-4" aria-hidden="true" />
                      : order.status === "delivered"
                        ? <Check className="size-4" aria-hidden="true" />
                        : <Clock3 className="size-4" aria-hidden="true" />}
                    {statusLabel(order.status)}
                  </div>

                  {order.status === "cancelled" ? (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Please contact the shop if you need help with this order.</p>
                  ) : (
                    <ol aria-label="Order status" className="mt-5 grid grid-cols-4 gap-2">
                      {steps.map((step, index) => {
                        const complete = index <= currentStep;
                        return (
                          <li key={step} className="min-w-0">
                            <div className={`h-1.5 rounded-full ${complete ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"}`} />
                            <span className={`mt-2 block truncate text-[11px] ${complete ? "font-semibold text-zinc-800 dark:text-zinc-200" : "text-zinc-400"}`}>
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
          <div className="rounded-xl bg-white p-6 text-center shadow-sm dark:bg-neutral-900">
            <PackageCheck className="mx-auto size-8 text-zinc-400" aria-hidden="true" />
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No order updates are available yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
