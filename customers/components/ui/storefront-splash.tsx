"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "pearl-and-pour-intro-seen";
const INTRO_DURATION_MS = 2400;
const EXIT_DURATION_MS = 400;

export function StorefrontSplash() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const shouldShowRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (shouldShowRef.current === null) {
      try {
        const hasSeenIntro = window.localStorage.getItem(STORAGE_KEY) === "true";
        shouldShowRef.current = !hasSeenIntro;

        if (!hasSeenIntro) {
          window.localStorage.setItem(STORAGE_KEY, "true");
        }
      } catch (error) {
        console.error("Unable to save the storefront intro preference.", error);
        shouldShowRef.current = true;
      }
    }

    if (!shouldShowRef.current) return;

    setVisible(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const introTimer = window.setTimeout(() => {
      setExiting(true);
    }, reducedMotion ? 300 : INTRO_DURATION_MS);
    const exitTimer = window.setTimeout(() => {
      setVisible(false);
    }, (reducedMotion ? 300 : INTRO_DURATION_MS) + (reducedMotion ? 0 : EXIT_DURATION_MS));

    return () => {
      window.clearTimeout(introTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label="Pearl & Pour is getting ready"
      className={`storefront-splash fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#fffaf4] text-zinc-900 dark:bg-neutral-950 dark:text-white${exiting ? " storefront-splash--exit" : ""}`}
      role="status"
    >
      <div aria-hidden="true" className="storefront-splash-bubbles absolute inset-0">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="storefront-splash-content relative flex flex-col items-center">
        <div className="storefront-splash-mark mb-3 text-rose-700 dark:text-rose-200">
          <svg aria-hidden="true" className="storefront-pour-art" viewBox="0 0 180 160" fill="none">
            <defs>
              <clipPath id="storefront-cup-clip">
                <path d="M47 78h86l-9 65a9 9 0 0 1-9 8H65a9 9 0 0 1-9-8l-9-65Z" />
              </clipPath>
            </defs>
            <ellipse cx="90" cy="151" rx="44" ry="5" fill="currentColor" opacity=".08" />
            <g className="storefront-pitcher">
              <path d="M27 22h49l-5 35a8 8 0 0 1-8 7H41a8 8 0 0 1-8-7l-6-35Z" fill="#fff7ed" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
              <path d="M27 22h49M33 30h37" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <path d="M76 25h12l-5 10-8-2" fill="#fff7ed" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
              <path d="M40 17h23" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </g>
            <path className="storefront-tea-stream" d="M83 43c2 12 4 23 8 35" stroke="#b77945" strokeWidth="7" strokeLinecap="round" />
            <g clipPath="url(#storefront-cup-clip)">
              <rect className="storefront-tea-fill" x="48" y="82" width="84" height="70" rx="4" fill="#c58a55" />
              <path d="M49 99c13-5 22 5 36 0s23 4 47-1v12H49V99Z" fill="#e6bd8e" opacity=".9" />
              <g className="storefront-pearls" fill="#452b26">
                <circle cx="69" cy="137" r="5" />
                <circle cx="85" cy="145" r="5" />
                <circle cx="102" cy="136" r="5" />
                <circle cx="117" cy="145" r="5" />
              </g>
            </g>
            <path d="M47 78h86l-9 65a9 9 0 0 1-9 8H65a9 9 0 0 1-9-8l-9-65Z" fill="#fff" fillOpacity=".2" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
            <ellipse cx="90" cy="79" rx="43" ry="9" fill="#fff7ed" stroke="currentColor" strokeWidth="4" />
            <path d="M101 73 119 15" stroke="#326354" strokeWidth="8" strokeLinecap="round" />
            <path d="M97 76 115 17" stroke="#a7d8b1" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Pearl &amp; Pour</h1>
        <p className="mt-2 text-sm tracking-wide text-zinc-600 dark:text-zinc-400">
          Freshly shaken, just for you
        </p>
        <div aria-hidden="true" className="storefront-splash-loader mt-8 flex gap-1.5">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
