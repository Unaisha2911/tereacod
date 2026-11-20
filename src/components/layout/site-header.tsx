"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/shared/shop-link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { Logo } from "./logo";
import { DesktopNavigation } from "./desktop-navigation";
import { MobileNavigation } from "./mobile-navigation";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { cn } from "@/lib/utils";
import { useCart } from "@/services/cart";
import type { NavigationItem } from "@/types";

/**
 * SiteHeader — single nav row (logo, desktop nav, search, cart, account).
 * Transparent over the hero, solidifies on scroll. Total height is 4rem;
 * the shell's <main> pads by the same amount. Navigation data arrives
 * from the server-rendered AppShell.
 *
 * Mobile chrome behaviour: scrolling down slides the whole header off
 * the top; scrolling up (or nearing the top) slides it back. Desktop
 * keeps the always-visible bar. The open mobile menu pins the header.
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
  const scrollDirection = useScrollDirection();
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const cartCount = useCart((s) => s.lines.reduce((count, line) => count + line.qty, 0));

  // Chrome hiding is a phone affordance — desktop keeps the fixed bar.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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

  // Hide while scrolling DOWN on phones — never while the sheet is open.
  const hideChrome = isMobile && !mobileOpen && scrollDirection === "down";

  return (
    <motion.header
      initial={reduced ? false : { y: "-110%", opacity: 0 }}
      animate={{ y: hideChrome ? "-110%" : "0%", opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        scrolled ? "glass-strong shadow-[0_10px_36px_-14px_rgba(23,68,105,0.28)]" : "bg-transparent"
      )}
      style={!scrolled ? { borderBottom: "1px solid transparent" } : undefined}
    >
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
                className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-violet-glow px-1 text-[0.6rem] font-bold leading-4 text-white"
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

          {/* Single light brand theme — no theme toggle. */}

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
