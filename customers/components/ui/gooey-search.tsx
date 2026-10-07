"use client";

import { useState, useRef, useEffect, useMemo, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { cn } from "@/shared/utils";

const EMPTY_ITEMS: string[] = [];

// ── Utilities ────────────────────────────────────────────────────────────────

function detectUnsupportedBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isSafari =
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("chromium") &&
    !ua.includes("android") &&
    !ua.includes("firefox");
  return isSafari || ua.includes("crios");
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Animation variants ───────────────────────────────────────────────────────

const buttonMotionVariants = {
  step1: { x: 0, width: 220 },
  step2: { x: 0, width: 340 },
};

const iconMotionVariants = {
  hidden: { x: -50, opacity: 0 },
  visible: { x: 16, opacity: 1 },
};

// ── Private sub-components ───────────────────────────────────────────────────

function LoadingSvgIcon() {
  const lines: [number, number, number, number][] = [
    [128, 32, 128, 64],
    [195.88, 60.12, 173.25, 82.75],
    [224, 128, 192, 128],
    [195.88, 195.88, 173.25, 173.25],
    [128, 224, 128, 192],
    [60.12, 195.88, 82.75, 173.25],
    [32, 128, 64, 128],
    [60.12, 60.12, 82.75, 82.75],
  ];
  return (
    <svg
      className="gooey-search-loading"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      aria-label="Loading"
      role="status"
      style={{ width: 20, height: 20 }}
    >
      <rect width="256" height="256" fill="none" />
      {lines.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={16}
        />
      ))}
    </svg>
  );
}

function InfoSvgIcon({ index }: { index: number }) {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.12 + 0.3 }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15 15"
      fill="none"
      aria-hidden="true"
      style={{ width: 18, height: 18, position: "relative", top: 2, flexShrink: 0 }}
    >
      <path
        d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM8.24992 4.49999C8.24992 4.9142 7.91413 5.24999 7.49992 5.24999C7.08571 5.24999 6.74992 4.9142 6.74992 4.49999C6.74992 4.08577 7.08571 3.74999 7.49992 3.74999C7.91413 3.74999 8.24992 4.08577 8.24992 4.49999ZM6.00003 5.99999H6.50003H7.50003C7.77618 5.99999 8.00003 6.22384 8.00003 6.49999V9.99999H8.50003H9.00003V11H8.50003H7.50003H6.50003H6.00003V9.99999H6.50003H7.00003V6.99999H6.50003H6.00003V5.99999Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </motion.svg>
  );
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface GooeySearchProps {
  /** Strings to search locally. Ignored when `onSearch` is provided. */
  items?: string[];
  /** Async/sync custom search function for external data sources. */
  onSearch?: (query: string) => Promise<string[]> | string[];
  /** Input placeholder text. */
  placeholder?: string;
  /** Label shown on the collapsed button. */
  buttonLabel?: string;
  /** Called when the user clicks a result item. */
  onSelect?: (item: string) => void;
  /** Extra class names for the outermost wrapper. */
  className?: string;
  /** Input debounce delay in ms. Defaults to 500. */
  debounceMs?: number;
  /** Maximum number of results to render. Defaults to 5. */
  maxResults?: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function GooeySearch({
  items = EMPTY_ITEMS,
  onSearch,
  placeholder = "Type to search...",
  buttonLabel = "Search",
  onSelect,
  className,
  debounceMs = 500,
  maxResults = 5,
}: GooeySearchProps) {
  const uid = useId().replace(/:/g, "_");
  const filterId = `gooey-search-${uid}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isUnsupported = useMemo(() => detectUnsupportedBrowser(), []);
  const debouncedQuery = useDebounce(searchText, debounceMs);

  // Step only ever advances 1 -> 2, so the effect's sole job is to focus the
  // freshly-mounted input. Nothing to reset here.
  useEffect(() => {
    if (step === 2) inputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    let cancelled = false;

    // All state writes live inside the async closure so none run synchronously
    // in the effect body (keeps React from cascading renders).
    const run = async () => {
      if (!debouncedQuery) {
        setResults((currentResults) => currentResults.length === 0 ? currentResults : []);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let data: string[];
        if (onSearch) {
          data = await onSearch(debouncedQuery);
        } else {
          await new Promise<void>((r) => setTimeout(r, 300));
          data = items.filter((item) =>
            item.toLowerCase().includes(debouncedQuery.trim().toLowerCase())
          );
        }
        if (!cancelled) setResults(data.slice(0, maxResults));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [debouncedQuery, items, onSearch, maxResults]);

  const btnPadding = isUnsupported ? "8px 14px" : "14px 26px";
  const resultPadding = "10px 14px";
  const selectResult = (item: string) => {
    setSearchText(item);
    setResults([]);
    setStep(1);
    inputRef.current?.blur();
    onSelect?.(item);
  };

  return (
    <div className={cn("relative z-50 inline-flex items-center justify-center", className)}>
      {/* Keyframe injection for loading spinner */}
      <style>{`
        .gooey-search-loading {
          animation: gooeySearchSpin 0.5s linear infinite;
          transform-origin: center center;
        }
        @keyframes gooeySearchSpin { to { transform: rotate(180deg); } }
        .gooey-search-input::placeholder { color: var(--background); opacity: 0.55; }
      `}</style>

      {/* SVG gooey filter — zero size, no layout impact */}
      <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -15"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <AnimatePresence>
        {step === 2 && (
          <motion.button
            type="button"
            aria-label="Close search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setStep(1);
              setResults([]);
              inputRef.current?.blur();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              width: "100%",
              height: "100%",
              border: 0,
              backgroundColor: "rgba(9, 9, 11, 0.14)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              cursor: "default",
            }}
          />
        )}
      </AnimatePresence>

      {/* Gooey container — this is where the morphing magic happens */}
      <div
        style={{
          cursor: "pointer",
          position: "relative",
          width: step === 1 ? 220 : "min(340px, calc(100vw - 32px))",
          transition: "width 0.75s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 1,
        }}
      >
        {/* Morphing search button */}
        <motion.div
          variants={buttonMotionVariants}
          initial="step1"
          animate={step === 1 ? "step1" : "step2"}
          transition={{ duration: 0.75, type: "spring", bounce: 0.15 }}
          onClick={() => step === 1 && setStep(2)}
          whileHover={{ scale: step === 2 ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
          role={step === 1 ? "button" : undefined}
          aria-label={step === 1 ? "Open search" : undefined}
          style={{
            filter: isUnsupported || step === 2 ? "none" : `url(#${filterId})`,
            backgroundColor: "var(--foreground)",
            color: "var(--background)",
            cursor: step === 1 ? "pointer" : "text",
            letterSpacing: -0.5,
            outline: "none",
            border: "none",
            borderRadius: 9999,
            padding: btnPadding,
            maxWidth: "100%",
          }}
        >
          {step === 1 ? (
            <span
              style={{
                pointerEvents: "none",
                textAlign: "center",
                position: "relative",
                color: "var(--background)",
                opacity: 0.72,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              <Search size={20} strokeWidth={2.25} aria-hidden="true" />
              {buttonLabel}
            </span>
          ) : (
            <input
              ref={inputRef}
              type="text"
              className="gooey-search-input"
              placeholder={placeholder}
              aria-label="Search input"
              role="combobox"
              aria-autocomplete="list"
              aria-controls={`${filterId}-results`}
              aria-expanded={results.length > 0}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setStep(1);
                  setResults([]);
                  inputRef.current?.blur();
                }
              }}
              style={{
                width: "100%",
                minWidth: 0,
                paddingRight: 40,
                backgroundColor: "transparent",
                outline: "none",
                border: "none",
                color: "var(--background)",
                fontSize: 16,
              }}
            />
          )}
        </motion.div>

        <AnimatePresence mode="popLayout">
          {results.length > 0 && <motion.div
            id={`${filterId}-results`}
            key="results-wrapper"
            role="listbox"
            aria-label="Search results"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute",
              zIndex: 30,
              top: "calc(100% + 10px)",
              left: 0,
              width: "100%",
              maxHeight: 280,
              marginTop: 10,
              padding: 6,
              border: "1px solid var(--border)",
              borderRadius: 16,
              backgroundColor: "var(--background)",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              overflowY: "auto",
            }}
          >
            {results.map((item, index) => (
              <motion.button
                key={item}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => selectResult(item)}
                whileHover={{ y: -1 }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, delay: index * 0.04 }}
                className="rounded-lg transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-zinc-800"
                style={{
                  padding: resultPadding,
                  width: "100%",
                  color: "var(--foreground)",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", minWidth: 0, alignItems: "center", gap: 8 }}>
                  <InfoSvgIcon index={index} />
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                </span>
              </motion.button>
            ))}
          </motion.div>}
        </AnimatePresence>

        {/* Floating icon bubble */}
        <AnimatePresence mode="wait">
          {step === 2 && (
            <motion.div
              key="icon-bubble"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={iconMotionVariants}
              transition={{ delay: 0.1, duration: 0.85, type: "spring", bounce: 0.15 }}
              style={{
                position: "absolute",
                backgroundColor: "var(--foreground)",
                width: isUnsupported ? 42 : 56,
                height: isUnsupported ? 42 : 56,
                right: -5,
                top: -1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 9999,
                color: "var(--background)",
              }}
            >
              {isLoading ? <LoadingSvgIcon /> : <Search className="size-6" aria-hidden="true" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default GooeySearch;
