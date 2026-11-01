"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/types";
import { cn } from "@/lib/utils";

/** DesktopNavigation — inline links with active indicator.
 *  Items are passed in from the server-rendered shell (headerNav()). */
export function DesktopNavigation({ items, className }: { items: NavigationItem[]; className?: string }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Primary" className={cn("hidden items-center gap-1 lg:flex", className)}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
            isActive(item.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
          {isActive(item.href) && (
            <span
              aria-hidden="true"
              className="absolute inset-x-4 -bottom-[1px] h-px bg-gradient-to-r from-transparent via-violet-soft to-transparent"
            />
          )}
        </Link>
      ))}
    </nav>
  );
}
