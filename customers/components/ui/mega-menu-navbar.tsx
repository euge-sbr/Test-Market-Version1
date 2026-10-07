"use client";

import * as React from "react";
import {
  Blocks,
  Briefcase,
  Building2,
  ChevronDown,
  FileText,
  Flame,
  Gamepad,
  Menu,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Trophy,
  Truck,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/shared/utils";
import { useCart } from "@/customers/state/cart-context";

export interface MegaMenuItem {
  title: string;
  description?: string;
  href: string;
  icon?: LucideIcon;
  iconClassName?: string;
  badge?: string;
}

export interface MegaMenuResourceGroup {
  title: string;
  links: MegaMenuItem[];
}

export interface MegaMenuNavbarProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  brandName?: string;
  brandHref?: string;
  logo?: React.ReactNode;
  categories?: MegaMenuItem[];
  collections?: MegaMenuItem[];
  resourceGroups?: MegaMenuResourceGroup[];
  accountHref?: string;
  accountLabel?: string;
  cartHref?: string;
  cartLabel?: string;
}

type SidebarSection = "categories" | "collections" | "pages";

const DEFAULT_CATEGORIES: MegaMenuItem[] = [
  { title: "Electronics", description: "Latest gadgets and tech accessories", href: "/shop/electronics", icon: Zap, iconClassName: "text-yellow-400" },
  { title: "Wearables", description: "Smartwatches, fitness trackers & more", href: "/shop/wearables", icon: Briefcase, iconClassName: "text-blue-400" },
  { title: "Accessories", description: "Cases, chargers, cables and stands", href: "/shop/accessories", icon: Blocks, iconClassName: "text-purple-400" },
  { title: "Gaming", description: "Keyboards, mice, controllers and headsets", href: "/shop/gaming", icon: Gamepad, iconClassName: "text-red-400" },
  { title: "Home & Office", description: "Desk accessories, lighting and organization", href: "/shop/home-office", icon: Building2, iconClassName: "text-green-400" },
  { title: "Audio", description: "Headphones, speakers and sound equipment", href: "/shop/audio", icon: Users, iconClassName: "text-indigo-400" },
];

const DEFAULT_COLLECTIONS: MegaMenuItem[] = [
  { title: "New Arrivals", description: "Just dropped - see what's new", href: "/collections/new", icon: Sparkles },
  { title: "Best Sellers", description: "Our most popular products", href: "/collections/best-sellers", icon: Trophy },
  { title: "Sale", description: "Limited time discounts and deals", href: "/collections/sale", icon: Flame },
];

const DEFAULT_RESOURCE_GROUPS: MegaMenuResourceGroup[] = [
  { title: "Company", links: [{ title: "About Us", href: "/about", icon: Building2 }, { title: "Contact", href: "/contact", icon: MessagesSquare }, { title: "Blog", href: "/blog", icon: FileText }] },
  { title: "Support", links: [{ title: "FAQ", href: "/faq", icon: MessagesSquare }, { title: "Shipping", href: "/shipping", icon: Truck }, { title: "Returns", href: "/returns", icon: RefreshCw }] }
];

const RESOURCE_DIALOGS = {
  "/about": {
    title: "About Us",
    paragraphs: [
      "Pearl & Pour brings independent drink makers and their handcrafted favorites together in one place. Explore the menu, discover customer favorites and new arrivals, and customize each drink to your taste.",
      "Every order supports the clients who create and share these drinks with our community.",
    ],
  },
  "/contact": {
    title: "Contact Us",
    paragraphs: [
      "Need help with a drink or an order? Our team is here to help with questions about the menu and your shopping experience.",
      "For order questions, include your order number and the email address used at checkout so the team can identify your purchase.",
    ],
  },
  "/blog": {
    title: "Blog",
    paragraphs: [
      "The Pearl & Pour journal is where we share stories from our drink makers, menu updates, and news from across the community.",
      "There are no articles published yet. Check back for updates and maker stories.",
    ],
  },
  "/faq": {
    title: "Frequently Asked Questions",
    paragraphs: [
      "How do I place an order? Add drinks to your cart, review your selections, and enter your details at checkout.",
      "Can I customize a drink? Yes. In your cart, choose the sugar level, ice level, and pearl option for each drink.",
      "Is there an extra charge for pearls? Extra Pearls adds $0.75 per drink. No Pearls and Less Pearls have no add-on charge.",
      "How can I track my order? Use the private tracking link shown after checkout to see each shop’s latest status.",
      "What payment methods are available? Checkout offers card and cash on delivery. Card processing is not enabled in this demo.",
    ],
  },
  "/shipping": {
    title: "Shipping & Delivery",
    paragraphs: [
      "Delivery is currently shown as free at checkout. Enter your full street address, city, and postal code when placing an order.",
      "Delivery timing can depend on the shop and order. If you have a delivery question, include your order number when contacting the team.",
    ],
  },
  "/returns": {
    title: "Returns & Order Issues",
    paragraphs: [
      "Drinks are prepared fresh for each order. If an item is missing or your order is not right, contact the team as soon as possible and include your order number.",
      "We’ll review the details and help determine an appropriate resolution for the issue.",
    ],
  },
} as const;

function isResourceDialogHref(href: string): href is keyof typeof RESOURCE_DIALOGS {
  return Object.hasOwn(RESOURCE_DIALOGS, href);
}

function Brand({ brandName, brandHref, logo, onNavigate }: { brandName: string; brandHref: string; logo?: React.ReactNode; onNavigate?: () => void }) {
  return <a href={brandHref} onClick={onNavigate} className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{logo ?? <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-50"><Blocks className="size-5 text-white dark:text-zinc-900" /></span>}<span>{brandName}</span></a>;
}

function SidebarLink({
  item,
  onNavigate,
  onOpenDialog,
}: {
  item: MegaMenuItem;
  onNavigate?: () => void;
  onOpenDialog?: (href: keyof typeof RESOURCE_DIALOGS) => void;
}) {
  const Icon = item.icon;
  const href = item.href;
  const content = <>
    {Icon ? <Icon className={cn("mt-0.5 size-4 shrink-0", item.iconClassName ?? "text-zinc-400")} /> : null}
    <span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100"><span>{item.title}</span>{item.badge ? <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">{item.badge}</span> : null}</span>{item.description ? <span className="mt-1.5 block text-sm leading-5 text-zinc-600 dark:text-zinc-400">{item.description}</span> : null}</span>
  </>;
  const className = "group flex items-start gap-3 rounded-lg px-3 py-3 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white";

  if (isResourceDialogHref(href) && onOpenDialog) {
    return <button type="button" onClick={() => { onOpenDialog(href); onNavigate?.(); }} className={`w-full ${className}`}>{content}</button>;
  }

  return <a href={item.href} onClick={onNavigate} className={className}>{content}</a>;
}

function SidebarSection({ title, value, openSection, onToggle, children }: { title: string; value: SidebarSection; openSection: SidebarSection | null; onToggle: (value: SidebarSection) => void; children: React.ReactNode }) {
  const isOpen = openSection === value;
  return <div className="border-b border-zinc-300 py-2 dark:border-zinc-700"><button type="button" aria-expanded={isOpen} onClick={() => onToggle(value)} className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-bold text-zinc-950 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:text-white dark:hover:bg-zinc-900">{title}<ChevronDown className={cn("size-5 text-zinc-500 transform dark:text-zinc-400", isOpen && "rotate-180")} /></button><div className={cn("grid transition-[grid-template-rows,opacity] duration-200", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}><div className="overflow-hidden"><div className="mt-1 flex flex-col gap-0.5 border-l border-zinc-300 pl-2 dark:border-zinc-700">{children}</div></div></div></div>;
}

export function MegaMenuNavbar({ brandName = "ShopMart", brandHref = "/", logo, categories = DEFAULT_CATEGORIES, collections = DEFAULT_COLLECTIONS, resourceGroups = DEFAULT_RESOURCE_GROUPS, accountHref = "/account", accountLabel = "Account", cartHref = "/cart", cartLabel = "Cart", className, ...props }: MegaMenuNavbarProps) {
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openSection, setOpenSection] = React.useState<SidebarSection | null>("categories");
  const [activeDialogHref, setActiveDialogHref] = React.useState<keyof typeof RESOURCE_DIALOGS | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const dialogCloseButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileOpen]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!activeDialogHref) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialogCloseButtonRef.current?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setActiveDialogHref(null);
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
  }, [activeDialogHref]);

  const closeMobile = () => setMobileOpen(false);
  const toggleSection = (section: SidebarSection) => setOpenSection((current) => current === section ? null : section);
  const resourceItems = resourceGroups.flatMap((group) => group.links);

  return (
    <>
      <button type="button" aria-label="Open navigation menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-40 flex size-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 lg:hidden"><Menu className="size-5" /></button>
      <div aria-hidden={!mobileOpen} onClick={closeMobile} className={cn("fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside {...props} className={cn("fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 lg:translate-x-0 lg:shadow-none", mobileOpen && "translate-x-0", className)}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-5 dark:border-zinc-800"><Brand brandName={brandName} brandHref={brandHref} logo={logo} onNavigate={closeMobile} /><button ref={closeButtonRef} type="button" onClick={closeMobile} aria-label="Close navigation menu" className="flex size-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-900 lg:hidden"><X className="size-5" /></button></div>
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-5"><a href={cartHref} onClick={closeMobile} className="mb-2 flex rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900">{cartLabel} {totalItems > 0 && <span className="ml-2 h-5 w-5 flex items-center justify-center text-xs font-bold rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">{totalItems}</span>}</a><SidebarSection title="Categories" value="categories" openSection={openSection} onToggle={toggleSection}>{categories.map((item) => <SidebarLink key={item.title} item={item} onNavigate={closeMobile} />)}</SidebarSection><SidebarSection title="Collections" value="collections" openSection={openSection} onToggle={toggleSection}>{collections.map((item) => <SidebarLink key={item.title} item={item} onNavigate={closeMobile} />)}</SidebarSection><SidebarSection title="Pages" value="pages" openSection={openSection} onToggle={toggleSection}>{resourceItems.map((item) => <SidebarLink key={item.title} item={item} onNavigate={closeMobile} onOpenDialog={setActiveDialogHref} />)}</SidebarSection></nav>
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"><a href={accountHref} onClick={closeMobile} className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">{accountLabel}</a><a href={cartHref} onClick={closeMobile} className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">{cartLabel}</a></div>
      </aside>
      {activeDialogHref && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveDialogHref(null);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-dialog-title"
            tabIndex={-1}
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-950 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Pearl &amp; Pour</p>
                <h2 id="resource-dialog-title" className="mt-2 text-2xl font-bold text-zinc-950 dark:text-zinc-50">{RESOURCE_DIALOGS[activeDialogHref].title}</h2>
              </div>
              <button
                ref={dialogCloseButtonRef}
                type="button"
                onClick={() => setActiveDialogHref(null)}
                aria-label={`Close ${RESOURCE_DIALOGS[activeDialogHref].title} dialog`}
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {RESOURCE_DIALOGS[activeDialogHref].paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MegaMenuNavbar;