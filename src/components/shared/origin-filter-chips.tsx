"use client";

import { ORIGIN_LINES } from "@/lib/catalog-origin";
import { cn } from "@/lib/utils";

/**
 * OriginFilterChips — chip row for the TEREA origin (sourcing) lines.
 * "All origins" plus one chip per known line with a live product count.
 * Used on the discover grid, collection pages and brand pages; the
 * origin landing pages (/origin/<slug>) cross-link the same lines.
 */
export function OriginFilterChips({
  value,
  onChange,
  counts,
  ariaLabel = "Filter by origin line",
  className,
}: {
  /** Active line slug or "all". */
  value: string;
  onChange: (next: string) => void;
  /** Product counts per slug (and "all") — hides zero-count lines when omitted. */
  counts?: Record<string, number>;
  ariaLabel?: string;
  className?: string;
}) {
  const options = [
    { slug: "all", label: "All origins", flag: "", count: counts?.all },
    ...ORIGIN_LINES.map((line) => ({
      slug: line.slug,
      label: line.chipLabel,
      flag: line.flag,
      count: counts?.[line.slug],
    })),
  ].filter((option) => counts ? (option.count ?? 0) > 0 || option.slug === "all" || option.slug === value : true);

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
        const active = value === option.slug;
        return (
          <button
            key={option.slug}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.slug)}
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
          </button>
        );
      })}
    </div>
  );
}
