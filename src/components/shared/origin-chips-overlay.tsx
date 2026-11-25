"use client";

import { Link } from "@/components/shared/shop-link";
import { useState } from "react";
import { ArrowRight, Globe } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatAED } from "@/lib/utils";
import type { OriginLine } from "@/lib/catalog-origin";

/**
 * OriginChipsOverlay — the origin layer over a catalog card image.
 *
 *  - Single-origin listing → one plain chip (not interactive; the card
 *    itself is the link), exactly like the original chip row.
 *  - Multi-origin listing → a SINGLE "See all origins" trigger instead of
 *    a stack of chips. On mobile the stacked chips used to crawl over the
 *    whole product image; one compact trigger keeps the photo visible.
 *    Tapping it opens a bottom sheet (mobile) / compact dialog (desktop)
 *    listing EVERY sourcing line WITH its live AED price; each row
 *    deep-links to the product page with that origin preselected
 *    (`/products/<slug>?origin=<line>`), so the price shown in the popup
 *    is the price the product page opens at.
 *
 * Prices arrive keyed by origin-line slug from the card — they are part of
 * the card projection the list endpoints already return, so this popup
 * never fetches anything itself.
 *
 * The overlay renders as a SIBLING of the card's image Link (the card
 * positions it absolutely) — a real button must never live inside an
 * anchor, and the portaled dialog rows would be un-navigable there.
 */
export function OriginChipsOverlay({
  lines,
  productSlug,
  productName,
  prices,
  className,
}: {
  lines: readonly OriginLine[];
  productSlug: string;
  productName: string;
  /** Per-origin prices keyed by line slug (undefined → rows without prices). */
  prices?: Record<string, { price: number; available: boolean }>;
  /** Positioning classes from the card — `absolute bottom-3 left-3 …`. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (lines.length === 0) return null;

  // Single origin — one plain, non-interactive chip.
  if (lines.length === 1) {
    const line = lines[0];
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white/90 px-2.5 py-1 text-[0.65rem] font-semibold text-foreground shadow-[0_2px_8px_-4px_rgba(23,68,105,0.3)] backdrop-blur-sm"
          title={`Origin: ${line.label}`}
        >
          <span aria-hidden="true" className="text-[0.8rem] leading-none">
            {line.flag}
          </span>
          {line.chipLabel}
        </span>
      </div>
    );
  }

  // Multi-origin — one trigger, full priced list in the dialog.
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`See all ${lines.length} origins and prices of ${productName}`}
            title={`See all origins — ${lines.map((line) => line.label).join(", ")}`}
            className={cn(
              "relative inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong bg-white/90 px-2.5 py-1 text-[0.65rem] font-semibold text-foreground shadow-[0_2px_8px_-4px_rgba(23,68,105,0.3)] backdrop-blur-sm transition-colors",
              "hover:border-violet-glow/60 hover:text-violet-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/60",
              // Expanded invisible hit-area keeps the chip visual while
              // giving thumbs a proper touch target (same pattern as the
              // card's save / quick-add buttons).
              "before:absolute before:-inset-2 before:rounded-full before:content-['']"
            )}
          >
            <Globe className="size-3.5 shrink-0 text-violet-soft" aria-hidden="true" />
            See all origins
          </button>
        </DialogTrigger>
        <DialogContent
          className={cn(
            // Mobile — bottom sheet: thumb-reachable, edge-to-edge, safe-area
            // aware padding at the bottom.
            "top-auto right-0 bottom-0 left-0 max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none border-x-0 border-b-0 px-5 pt-4 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))]",
            // sm+ — compact centered dialog.
            "sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:max-w-sm sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border-x sm:border-b sm:border-t sm:px-6 sm:pb-6"
          )}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-base font-semibold">All origins &amp; prices</DialogTitle>
            <DialogDescription className="text-[0.82rem]">
              {productName} is stocked from {lines.length} sourcing lines — every line with its
              pack price. Pick one to open it with that origin selected.
            </DialogDescription>
          </DialogHeader>
          <ul role="list" className="max-h-[52vh] space-y-1.5 overflow-y-auto sm:max-h-72">
            {lines.map((line) => {
              const price = prices?.[line.slug];
              return (
                <li key={line.slug}>
                  <DialogClose asChild>
                    <Link
                      href={`/products/${productSlug}?origin=${line.slug}`}
                      aria-label={
                        price
                          ? `Open ${productName} — ${line.label} origin, ${formatAED(price.price)}`
                          : `Open ${productName} — ${line.label} origin`
                      }
                      className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5 transition-colors hover:border-violet-glow/50 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50"
                    >
                      <span aria-hidden="true" className="text-lg leading-none">
                        {line.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.86rem] font-medium text-foreground">
                        {line.label}
                      </span>
                      {price &&
                        (price.available ? (
                          <span className="shrink-0 font-display text-[0.86rem] font-semibold text-foreground">
                            {formatAED(price.price)}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Sold out
                          </span>
                        ))}
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </DialogClose>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
