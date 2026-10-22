"use client";

import { useState, useRef, useEffect, useMemo, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CupSoda, Search, Store, X } from "lucide-react";
import { cn } from "@/shared/utils";

export interface GooeySearchItem {
  label: string;
  subtitle?: string;
  imageUrl?: string | null;
  kind?: "shop" | "product";
}

export type GooeySearchEntry = string | GooeySearchItem;

const EMPTY_ITEMS: GooeySearchEntry[] = [];

function normalizeEntry(entry: GooeySearchEntry): GooeySearchItem {
  return typeof entry === "string" ? { label: entry } : entry;
}

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
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={18}
        />
      ))}
    </svg>
  );
}

function SuggestionThumbnail({ item }: { item: GooeySearchItem }) {
  const isShop = item.kind === "shop";

  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.imageUrl}
        alt=""
        aria-hidden="true"
        className={cn(
          "size-8 shrink-0 border border-zinc-200 bg-zinc-100 object-cover dark:border-zinc-700 dark:bg-zinc-800",
          isShop ? "rounded-full" : "rounded-lg",
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        isShop ? "rounded-full" : "rounded-lg",
      )}
    >
      {isShop ? <Store className="size-4" /> : <CupSoda className="size-4" />}
    </span>
  );
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface GooeySearchProps {
  /** Strings or rich items to search locally. Ignored when `onSearch` is provided. */
  items?: GooeySearchEntry[];
  /** Async/sync custom search function for external data sources. */
  onSearch?: (query: string) => Promise<GooeySearchEntry[]> | GooeySearchEntry[];
  /** Input placeholder text. */
  placeholder?: string;
  /** Label shown on the collapsed button. */
  buttonLabel?: string;
  /** Called when the user selects a result item or submits/clears the query. */
  onSelect?: (item: string) => void;
  /** Controlled or external value to sync into the search bar (e.g. category/hash navigation). */
  value?: string;
  /** Extra class names for the outermost wrapper. */
  className?: string;
  /** Input debounce delay in ms. Defaults to 220. */
  debounceMs?: number;
  /** Maximum number of results to render. Defaults to 6. */
  maxResults?: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function GooeySearch({
  items = EMPTY_ITEMS,
  onSearch,
  placeholder = "Type to search...",
  buttonLabel = "Search",
  onSelect,
  value,
  className,
  debounceMs = 220,
  maxResults = 6,
}: GooeySearchProps) {
  const uid = useId().replace(/:/g, "_");
  const filterId = `gooey-search-${uid}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const onSearchRef = useRef(onSearch);
  const [step, setStep] = useState<1 | 2>(1);
  const [searchText, setSearchText] = useState(value ?? "");
  const [results, setResults] = useState<GooeySearchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (value !== undefined && value !== searchText && step === 1) {
      setSearchText(value);
    }
  }, [value, searchText, step]);

  const isUnsupported = useMemo(() => detectUnsupportedBrowser(), []);
  const debouncedQuery = useDebounce(searchText, debounceMs);

  useEffect(() => {
    if (step === 2) {
      inputRef.current?.focus();
    } else {
      setActiveIndex(-1);
    }
  }, [step]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const trimmed = debouncedQuery.trim();
      if (!trimmed) {
        setResults((current) => (current.length === 0 ? current : []));
        setHasSearched(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let data: GooeySearchEntry[];
        if (onSearchRef.current) {
          data = await onSearchRef.current(trimmed);
        } else {
          data = items
            .map(normalizeEntry)
            .filter((item) => item.label.toLowerCase().includes(trimmed.toLowerCase()));
        }
        if (!cancelled) {
          const seen = new Set<string>();
          const uniqueItems: GooeySearchItem[] = [];
          for (const raw of data) {
            const normalized = normalizeEntry(raw);
            const key = `${normalized.kind ?? ""}:${normalized.label.toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueItems.push(normalized);
            }
          }
          setResults(uniqueItems.slice(0, maxResults));
          setHasSearched(true);
          setActiveIndex(-1);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, items, maxResults]);

  const handleInputChange = (nextValue: string) => {
    setSearchText(nextValue);
    if (!nextValue.trim()) {
      setResults([]);
      setHasSearched(false);
      void onSearchRef.current?.("");
      onSelect?.("");
    }
  };

  const clearSearch = () => {
    setSearchText("");
    setResults([]);
    setHasSearched(false);
    setActiveIndex(-1);
    void onSearchRef.current?.("");
    onSelect?.("");
    if (step === 2) {
      inputRef.current?.focus();
    }
  };

  const selectResult = (label: string) => {
    setSearchText(label);
    setResults([]);
    setHasSearched(false);
    setStep(1);
    inputRef.current?.blur();
    onSelect?.(label);
  };

  const submitCurrentText = () => {
    if (activeIndex >= 0 && activeIndex < results.length) {
      selectResult(results[activeIndex].label);
      return;
    }
    const trimmed = searchText.trim();
    setResults([]);
    setHasSearched(false);
    setStep(1);
    inputRef.current?.blur();
    onSelect?.(trimmed);
  };

  const hasQuery = searchText.trim().length > 0;
  const showDropdown = step === 2 && hasQuery && (results.length > 0 || (hasSearched && !isLoading));

  return (
    <div className={cn("relative z-50 inline-flex items-center justify-center", className)}>
      <style>{`
        .gooey-search-loading {
          animation: gooeySearchSpin 0.65s linear infinite;
          transform-origin: center center;
        }
        @keyframes gooeySearchSpin { to { transform: rotate(360deg); } }
        .gooey-search-input::placeholder { color: var(--background); opacity: 0.55; }
      `}</style>

      {/* SVG gooey liquid filter applied to the background shapes layer */}
      <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id={filterId} x="-25%" y="-50%" width="150%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Backdrop overlay when search is open */}
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
              setHasSearched(false);
              inputRef.current?.blur();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              width: "100%",
              height: "100%",
              border: 0,
              backgroundColor: "rgba(9, 9, 11, 0.16)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              cursor: "default",
            }}
          />
        )}
      </AnimatePresence>

      {/* Main interactive search shell */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{
          width: step === 1 ? "auto" : "min(410px, calc(100vw - 32px))",
        }}
      >
        {/* GOOEY SHAPES LAYER: holds both the expanding pill & the detached liquid orb */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center"
          style={{
            filter: isUnsupported ? "none" : `url(#${filterId})`,
          }}
        >
          <motion.div
            layout
            initial={false}
            animate={{
              width: step === 1 ? "100%" : "calc(100% - 62px)",
            }}
            transition={{ duration: 0.65, type: "spring", bounce: 0.22 }}
            style={{
              height: 52,
              borderRadius: 9999,
              backgroundColor: "var(--foreground)",
            }}
          />
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                key="gooey-orb-bg"
                initial={{ x: -58, scale: 0.5, opacity: 0 }}
                animate={{ x: 10, scale: 1, opacity: 1 }}
                exit={{ x: -58, scale: 0.45, opacity: 0 }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.28 }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 9999,
                  backgroundColor: "var(--foreground)",
                  flexShrink: 0,
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* CRISP FOREGROUND LAYER: sharp text, input, clear button, and orb icon */}
        <div className="relative z-10 flex h-[52px] w-full items-center">
          {step === 1 ? (
            <div className="flex h-full items-center gap-1 px-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                aria-label="Open search"
                className="flex h-full cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap text-base font-medium tracking-tight transition-transform active:scale-95"
                style={{ color: "var(--background)" }}
              >
                <Search className="size-4 shrink-0 opacity-80" strokeWidth={2.4} aria-hidden="true" />
                <span className="max-w-[180px] truncate">
                  {hasQuery ? searchText : buttonLabel}
                </span>
              </button>
              {hasQuery && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    clearSearch();
                  }}
                  aria-label="Clear active search"
                  title="Clear search"
                  className="ml-1 flex size-6 items-center justify-center rounded-full opacity-75 transition hover:bg-white/20 hover:opacity-100 dark:hover:bg-black/20"
                  style={{ color: "var(--background)" }}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                className="flex h-full items-center pl-5 pr-3"
                style={{ width: "calc(100% - 62px)" }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className="gooey-search-input h-full w-full min-w-0 bg-transparent text-base outline-none"
                  placeholder={placeholder}
                  aria-label="Search drinks or shops"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={`${filterId}-results`}
                  aria-expanded={showDropdown}
                  value={searchText}
                  onChange={(event) => handleInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setStep(1);
                      setResults([]);
                      setHasSearched(false);
                      inputRef.current?.blur();
                    } else if (event.key === "ArrowDown") {
                      if (results.length === 0) return;
                      event.preventDefault();
                      setActiveIndex((prev) => (prev + 1) % results.length);
                    } else if (event.key === "ArrowUp") {
                      if (results.length === 0) return;
                      event.preventDefault();
                      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      submitCurrentText();
                    }
                  }}
                  style={{ color: "var(--background)" }}
                />
                {hasQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search text"
                    title="Clear"
                    className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-full opacity-75 transition hover:bg-white/15 hover:opacity-100 dark:hover:bg-black/15"
                    style={{ color: "var(--background)" }}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Detached orb button on the right */}
              <motion.button
                type="button"
                onClick={submitCurrentText}
                aria-label="Submit search"
                initial={{ x: -58, scale: 0.5, opacity: 0 }}
                animate={{ x: 10, scale: 1, opacity: 1 }}
                exit={{ x: -58, scale: 0.45, opacity: 0 }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.28 }}
                className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full"
                style={{ color: "var(--background)" }}
              >
                {isLoading ? (
                  <LoadingSvgIcon />
                ) : (
                  <Search className="size-5" strokeWidth={2.4} aria-hidden="true" />
                )}
              </motion.button>
            </>
          )}
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence mode="popLayout">
          {showDropdown && (
            <motion.div
              id={`${filterId}-results`}
              key="results-wrapper"
              role="listbox"
              aria-label="Search suggestions"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute left-0 top-[calc(100%+12px)] z-30 flex max-h-80 w-full flex-col gap-1 overflow-y-auto rounded-2xl border border-white/45 bg-white/30 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/15 dark:bg-zinc-950/35"
            >
              {results.length > 0 ? (
                results.map((item, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <motion.button
                      key={`${item.kind ?? "item"}:${item.label}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectResult(item.label)}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.14, delay: index * 0.03 }}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                        isActive
                          ? "bg-white/65 text-zinc-950 shadow-xs dark:bg-white/15 dark:text-white"
                          : "text-zinc-900 hover:bg-white/50 dark:text-zinc-100 dark:hover:bg-white/10",
                      )}
                    >
                      <SuggestionThumbnail item={item} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{item.label}</p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  );
                })
              ) : (
                <div className="px-3.5 py-3 text-center text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  No matching drinks or shops found for &ldquo;{searchText.trim()}&rdquo;
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default GooeySearch;
