"use client";

import Link from "next/link";
import { ORIGIN_LINES } from "@/lib/catalog-origin";
import { cn } from "@/lib/utils";

/**
 * OriginFilterChips — LINK chip row for the TEREA origin (sourcing) lines.
 *
 * Every chip NAVIGATES to the line's dedicated landing page
 * (/origin/<slug>) — origins are first-class pages with their own hero
 * copy, SEO blocks and URL, so filtering by origin lands there instead of
 * narrowing the list in place. The current page's other active filters
 * travel along as query params (?collection=…&brand=…&q=…), which makes
 * combined faceting work across pages: a collection shelf's Japan chip
 * opens the Japan line pre-narrowed to that collection, and the origin
 * page keeps the combination clearable via its active-filter bar.
 *
 * Counts are facet counts (multi-origin listings count toward EVERY line
 * they stock) and zero-count lines stay hidden unless they are the page
 * you are already on.
 */
export function OriginFilterChips({
  counts,
  context,
  activeSlug,
  ariaLabel = "Shop by origin line",
  className,
}: {
  /** Facet counts per line slug — hides zero-count lines when omitted. */
  counts?: Record<string, number>;
  /** Other active filters carried into the origin page's combined view. */
  context?: Record<string, string | undefined>;
  /** Slug of the line whose page you are already on (aria-current). */
  activeSlug?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const hrefFor = (slug: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(context ?? {})) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/origin/${slug}?${qs}` : `/origin/${slug}`;
  };

  const options = ORIGIN_LINES.map((line) => ({
    slug: line.slug,
    label: line.chipLabel,
    flag: line.flag,
    href: hrefFor(line.slug),
    count: counts?.[line.slug],
  })).filter((option) => (counts ? (option.count ?? 0) > 0 || option.slug === activeSlug : true));

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0",
        className
      )}
    >
      {options.map((option) => {
        const active = option.slug === activeSlug;
        return (
          <Link
            key={option.slug}
            href={option.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[0.8rem] font-medium transition-colors",
              active
                ? "border-violet-glow/50 bg-violet-glow/15 text-foreground"
                : "border-line text-muted-foreground hover:border-line-strong hover:text-foreground"
            )}
          >
            {option.flag && (
              <span aria-hidden="true" className="text-[0.9rem] leading-none">
                {option.flag}
              </span>
            )}
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none",
                  active ? "bg-violet-glow/20 text-foreground" : "bg-foreground/[0.06] text-muted-foreground"
                )}
              >
                {option.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
