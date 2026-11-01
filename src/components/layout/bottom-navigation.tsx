"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, Home, ShoppingBag, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/services/cart";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/types";

const ICONS: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  home: Home,
  compass: Compass,
  cart: ShoppingBag,
  bookmark: Bookmark,
  user: UserRound,
};

/**
 * BottomNavigation — app-like five-destination bar (mobile only).
 * Fixed to viewport, safe-area aware, active-route indicator,
 * 48px touch targets, keyboard accessible. The Cart destination
 * carries a live item-count badge from the in-memory cart store.
 * Destinations are passed in from the server-rendered shell (mobileNav()).
 */
export function BottomNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();
  const cartCount = useCart((s) => s.lines.reduce((count, line) => count + line.qty, 0));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Primary mobile"
      className="glass-strong fixed inset-x-0 bottom-0 z-50 border-t border-line md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.25rem)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {items.map((item) => {
          const Icon = ICONS[item.icon ?? "compass"] ?? Compass;
          const active = isActive(item.href);
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={
                  item.href === "/cart" ? `Cart${cartCount > 0 ? `, ${cartCount} item(s)` : ""}` : undefined
                }
                className={cn(
                  "relative mx-auto flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 pt-1.5 text-[0.62rem] font-medium tracking-wide transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-indicator"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute top-0 h-[2px] w-9 rounded-full bg-gradient-to-r from-violet-glow to-ice"
                    aria-hidden="true"
                  />
                )}
                <span className={cn("relative", active && "drop-shadow-[0_0_8px_rgba(139,92,246,0.7)]")}>
                  <Icon className="size-[1.35rem]" aria-hidden={true} />
                  {item.href === "/cart" && cartCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-2 -top-1 flex min-w-4 items-center justify-center rounded-full bg-violet-glow px-1 text-[0.58rem] font-bold leading-4 text-white shadow-[0_0_8px_rgba(139,92,246,0.8)]"
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-violet-soft" aria-hidden="true" />
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
