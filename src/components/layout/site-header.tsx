"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Banknote, Bookmark, Menu, Search, ShoppingBag, Truck, UserRound, Zap } from "lucide-react";
import { Logo } from "./logo";
import { DesktopNavigation } from "./desktop-navigation";
import { MobileNavigation } from "./mobile-navigation";
import { cn } from "@/lib/utils";
import { useCart } from "@/services/cart";
import { ThemeToggle } from "@/components/theme-toggle";
import { USP_FREE_DELIVERY, USP_ONE_HOUR_DELIVERY, USP_PAYMENT } from "@/lib/usp";
import type { NavigationItem } from "@/types";

/**
 * SiteHeader — announcement strip (delivery promises) + nav row.
 * Transparent over the hero, solidifies on scroll. Total height is
 * 2.25rem + 4rem (announcement + nav); the shell's <main> pads by the
 * same amount. Navigation data arrives from the server-rendered AppShell.
 */
export function SiteHeader({
  headerNav,
  mobileNav,
  footerColumns,
  legalNav,
}: {
  headerNav: NavigationItem[];
  mobileNav: NavigationItem[];
  footerColumns: NavigationItem[][];
  legalNav: NavigationItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const cartCount = useCart((s) => s.lines.reduce((count, line) => count + line.qty, 0));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on route change (derived-during-render pattern).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  const submitQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickSearch.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    setSearchOpen(false);
  };

  return (
    <motion.header
      initial={reduced ? false : { y: -104, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        scrolled ? "glass-strong shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]" : "bg-transparent"
      )}
      style={!scrolled ? { borderBottom: "1px solid transparent" } : undefined}
    >
      {/* Announcement strip — the ordering promises, visible on every page.
          The 1-hour promise gets the emphasized pill (the headline USP). */}
      <div
        className="border-b border-line/70 bg-[linear-gradient(90deg,rgba(139,92,246,0.18),rgba(111,214,242,0.10)_50%,rgba(139,92,246,0.18))]"
        role="note"
        aria-label="Delivery and payment promises"
      >
        <div className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-1.5 overflow-x-auto px-3 text-[0.6rem] font-medium text-muted-foreground sm:tracking-wide [scrollbar-width:none] sm:gap-2 sm:px-6 sm:text-[0.75rem] lg:px-8 [&::-webkit-scrollbar]:hidden">
          <span className="inline-flex items-center gap-1 whitespace-nowrap sm:gap-1.5">
            <Truck className="size-3 shrink-0 text-violet-soft sm:size-3.5" aria-hidden="true" />
            {USP_FREE_DELIVERY}
          </span>
          <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/50" />
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-violet-glow/45 bg-violet-glow/15 px-2 py-0.5 font-semibold text-foreground shadow-[0_0_10px_rgba(139,92,246,0.35)] sm:gap-1.5 sm:px-2.5">
            <Zap className="size-3 shrink-0 text-violet-soft sm:size-3.5" aria-hidden="true" />
            {USP_ONE_HOUR_DELIVERY}
          </span>
          <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/50" />
          <span className="inline-flex items-center gap-1 whitespace-nowrap sm:gap-1.5">
            <Banknote className="size-3 shrink-0 text-violet-soft sm:size-3.5" aria-hidden="true" />
            {USP_PAYMENT}
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <DesktopNavigation items={headerNav} className="ml-6" />

        <div className="ml-auto flex items-center gap-1.5">
          {/* Search — inline expand on desktop. On mobile, search lives in
              the bottom-sheet menu (Explore → Search) to keep the bar clean. */}
          <form onSubmit={submitQuickSearch} role="search" className="hidden md:block">
            <div className="group relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search TEREA sticks and flavours…"
                aria-label="Search TEREA sticks and flavours"
                className={cn(
                  "h-10 w-44 rounded-full border border-line bg-foreground/[0.04] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-[border-color,background-color] duration-300 focus:border-violet-glow/50 focus:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-glow/60 xl:w-56",
                  searchOpen && quickSearch && "w-64 xl:w-72"
                )}
              />
            </div>
          </form>

          {/* Cart, saved and account mirror the mobile bottom navigation —
              icon-only entries stay ≥ md so phones see logo + menu only. */}
          <Link
            href="/cart"
            aria-label={`Cart${cartCount > 0 ? `, ${cartCount} ${cartCount === 1 ? "item" : "items"}` : ""}`}
            className="relative hidden size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:inline-flex"
          >
            <ShoppingBag className="size-[1.15rem]" aria-hidden="true" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-violet-glow px-1 text-[0.6rem] font-bold leading-4 text-white shadow-[0_0_8px_rgba(139,92,246,0.8)]"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/saved"
            aria-label="Saved items"
            className="hidden size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:inline-flex"
          >
            <Bookmark className="size-[1.15rem]" aria-hidden="true" />
          </Link>

          <Link
            href="/account"
            className="hidden h-10 items-center gap-2 rounded-full border border-line-strong bg-foreground/[0.03] px-4 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/40 hover:bg-foreground/[0.06] md:inline-flex"
          >
            <UserRound className="size-4" aria-hidden="true" />
            Account
          </Link>

          {/* Light/dark switch — visible at every breakpoint (the mobile
              sheet carries a second one); the choice persists per user. */}
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label="Open menu"
            className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <MobileNavigation
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        headerNav={headerNav}
        footerColumns={footerColumns}
        legalNav={legalNav}
      />
    </motion.header>
  );
}
