"use client";

import Image from "next/image";
import { Link } from "@/components/shared/shop-link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { pressTap } from "@/lib/motion";
import { Bookmark, BookmarkCheck, ImageOff, ShoppingBag } from "lucide-react";
import { memo, useState } from "react";
import { AvailabilityBadge } from "./status-badge";
import { CardSurface } from "@/components/atmosphere/card-surface";
import { savedItemsService, useSavedItems } from "@/services/saved-items";
import { cartService } from "@/services/cart";
import { ensureCatalogSubset } from "@/lib/client-catalog";
import { originLinesForItem, originPricesForItem, originPriceForSlug } from "@/lib/catalog-origin";
import type { OriginVariantPrice } from "@/lib/catalog-origin";
import { OriginChipsOverlay } from "./origin-chips-overlay";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useImageRetry } from "@/hooks/use-image-retry";
import type { CatalogCardItem } from "@/lib/catalog-card";
import { formatAED, cn } from "@/lib/utils";

/**
 * ItemCard — reusable catalog card.
 * Image + failure state, brand/name, metadata, price, availability,
 * saved control + quick-add (API-backed stores), pointer + keyboard interaction.
 *
 * PRICING CONTRACT (multi-origin listings):
 *  - Unfiltered shelves show the price RANGE when the origin lines carry
 *    different prices (AED 50 – 52); the "See all origins" popup lists the
 *    exact price per line. All of it derives from data the list endpoints
 *    already returned — no per-card fetches.
 *  - Origin-filtered shelves (activeOriginSlug) show THAT line's price.
 *  - Quick-add mirrors the displayed configuration: on an origin-filtered
 *    shelf it adds the shelf's origin (shelf-consistent pricing), elsewhere
 *    the product page default (the "from" price of the range).
 */
export const ItemCard = memo(function ItemCard({
  item,
  priority = false,
  activeOriginSlug,
}: {
  item: CatalogCardItem;
  priority?: boolean;
  /** Slug of the origin line this shelf is filtered by (/origin/<slug>). */
  activeOriginSlug?: string;
}) {
  const reduced = useReducedMotion();
  const router = useRouter();
  const { toast } = useToast();
  // Transient load failures retry twice (cache-busted) before the card
  // shows its fallback — a one-off Worker hiccup must not read as a broken
  // upload for the rest of the session.
  const { effectiveSrc, failed: imgFailed, onError: onImgError } = useImageRetry(item.images[0] ?? "");
  // Subscribed from the shared store (not a local snapshot) so every card
  // rendering the same item stays in sync with the product page toggle.
  const saved = useSavedItems((s) => s.items.some((i) => i.itemId === item.id));

  const blocked = item.availability === "out_of_stock" || item.availability === "unavailable";
  // EVERY sourcing line the listing belongs to — single-origin listings
  // show their one chip; multi-origin listings collapse to a single
  // "See all origins" trigger (stacked chips used to crawl over the whole
  // image on mobile) that opens a picker dialog deep-linking each origin.
  // Shared logic with the origin filter chips / landing pages, so a
  // product always shows the same origins everywhere it is listed.
  const originLines = originLinesForItem(item);
  // Per-origin prices (slug → row) — rides along with the card projection
  // or the full item; no extra requests. Drives the popup prices, the
  // card's price range and the active-origin re-price.
  const originPrices = originPricesForItem(item);
  const originPriceBySlug: Record<string, OriginVariantPrice> = Object.fromEntries(
    originPrices.map((row) => [row.slug, row])
  );
  const priceRows = originPrices.map((row) => row.price);
  const hasPriceRange =
    originPrices.length > 1 && Math.min(...priceRows) !== Math.max(...priceRows);
  const minPrice = priceRows.length ? Math.min(...priceRows) : item.price;
  const maxPrice = priceRows.length ? Math.max(...priceRows) : item.price;
  const activeOriginPrice = originPriceForSlug(originPrices, activeOriginSlug);
  // The compare-at "was" price is authored against the base configuration:
  // hide it whenever the displayed number is origin-adjusted or a range.
  const showCompareAt =
    item.compareAtPrice !== undefined && !hasPriceRange && !activeOriginPrice;

  const onToggleSaved = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    savedItemsService.toggle(item.id);
  };

  const onQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (blocked) return;
    // The default configuration needs just THIS product: fetch the single
    // slug into the mirror (one small CDN-cached request) instead of paging
    // the whole catalog. Fire-and-forget: the line lands with the correct
    // variant as soon as the fetch resolves.
    void (async () => {
      await ensureCatalogSubset({ slugs: [item.slug] }).catch(() => undefined);
      // Mirror the pre-selected configuration — on an origin-filtered shelf
      // THAT line's origin (so the added line and toast price match the
      // card's origin price), elsewhere the product page default (the
      // range's "from" price). Origin premiums are always included.
      const config = cartService.defaultVariantConfig(item.slug, activeOriginSlug);
      cartService.addItem(item.slug, config?.variantId ?? null, 1);
      toast({
        title: "Added to cart",
        description: `${item.name}${activeOriginPrice ? ` · ${activeOriginPrice.label}` : ""} · ${formatAED(config?.unitPrice ?? item.price)}`,
        action: <ToastAction altText="View cart" onClick={() => router.push("/cart")}>View cart</ToastAction>,
      });
    })();
  };

  return (
    <CardSurface
      as="article"
      className="h-full rounded-2xl border border-line bg-card shadow-[0_2px_12px_-6px_rgba(23,68,105,0.12)] transition-[border-color,box-shadow] duration-300 hover:border-violet-glow/35 hover:shadow-[0_10px_28px_-14px_rgba(23,68,105,0.25)]"
    >
      <motion.div
        whileHover={reduced ? undefined : { y: -4 }}
        whileTap={pressTap}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="flex h-full flex-col"
      >
        {/* Image link + origin overlay. The overlay is a SIBLING of the
            Link (not a child): the multi-origin "See all origins" trigger
            is a real button and must never nest inside an anchor, and its
            dialog rows navigate instead of re-triggering the card link. */}
        <div className="relative">
        <Link
          href={`/products/${item.slug}`}
          // prefetch={false}: every card in the viewport used to fire an RSC
          // prefetch of the dynamic shell as soon as it entered view — a
          // 30-card grid meant ~30 live Worker renders per visitor scroll
          // (prefetch requests bypass the anonymous HTML edge cache by
          // design). Product pages are force-dynamic, so the prefetch only
          // ever cached the loading shell, while the navigation itself still
          // rendered live. Skipping it removes a per-card Worker invocation
          // with almost no perceived cost (loading.tsx still shows instantly
          // on click).
          prefetch={false}
          className="group relative block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50 ring-offset-2 ring-offset-background"
          aria-label={`${item.brand} ${item.name} — view product information`}
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-muted">
            {!imgFailed && item.images[0] ? (
              <Image
                src={effectiveSrc}
                alt={`${item.brand} ${item.name}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={priority}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
                onError={onImgError}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageOff className="size-6" aria-hidden="true" />
                <span className="text-meta uppercase tracking-[0.14em]">Image unavailable</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--bg-1)] to-transparent" aria-hidden="true" />
            {item.isNew && (
              <span className="absolute left-3 top-3 rounded-full bg-ice/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ice backdrop-blur-sm">
                New
              </span>
            )}
          </div>
        </Link>
        <OriginChipsOverlay
          lines={originLines}
          productSlug={item.slug}
          productName={item.name}
          prices={originPriceBySlug}
          className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]"
        />
        </div>

        <button
          type="button"
          onClick={onToggleSaved}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${item.name} from saved items` : `Save ${item.name}`}
          className={cn(
            "absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full border transition-colors",
            // Invisible hit-area expansion keeps the 36px visual while
            // giving thumbs a ~48px touch target.
            "before:absolute before:-inset-2 before:rounded-full before:content-['']",
            // Solid scrim instead of backdrop-blur: a 16-card grid with two
            // blurred buttons each = ~32 backdrop-filter regions sampled
            // against scrolling content — a known mobile scroll-cost
            // multiplier. Visually near-identical at this size.
            saved ? "border-violet-glow/50 bg-violet-glow/30 text-violet-soft" : "border-line-strong bg-white/90 text-muted-foreground hover:text-foreground"
          )}
        >
          {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
        </button>

        <div className="flex flex-1 flex-col gap-2 p-5 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-violet-soft/90">{item.brand}</span>
            {item.nicotineStrength && (
              <span className="rounded-full border border-line px-2 py-0.5 text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                {item.nicotineStrength}
              </span>
            )}
          </div>
          <h3 className="font-display text-[1.02rem] font-semibold leading-snug text-foreground">
            <Link href={`/products/${item.slug}`} prefetch={false} className="transition-colors hover:text-violet-soft">
              {item.name}
            </Link>
          </h3>
          <p className="line-clamp-2 text-[0.82rem] leading-relaxed text-muted-foreground">{item.tagline}</p>
          <div className="mt-auto space-y-2.5 pt-2">
            {/* Price row + quick-add. Origin-aware: a true range on
                unfiltered shelves (exact per-line prices live in the
                See-all-origins popup), the shelf line's price on
                origin-filtered ones. */}
            <div className="flex items-center justify-between gap-2">
              <p
                className="font-display text-[1.02rem] font-semibold text-foreground"
                aria-label={
                  activeOriginPrice
                    ? `${activeOriginPrice.label} line — ${formatAED(activeOriginPrice.price)}`
                    : hasPriceRange
                      ? `From ${formatAED(minPrice)} to ${formatAED(maxPrice)} depending on origin`
                      : formatAED(item.price)
                }
              >
                {activeOriginPrice
                  ? formatAED(activeOriginPrice.price)
                  : hasPriceRange
                    ? formatAED(minPrice)
                    : formatAED(item.price)}
                {hasPriceRange && !activeOriginPrice && (
                  <span className="text-[0.78rem] font-normal text-muted-foreground">
                    {" "}– {formatAED(maxPrice)}
                  </span>
                )}
                {showCompareAt && (
                  <span className="ml-2 text-[0.78rem] font-normal text-muted-foreground line-through">
                    {formatAED(item.compareAtPrice as number)}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={onQuickAdd}
                disabled={blocked}
                aria-label={blocked ? `${item.name} is currently unavailable` : `Add ${item.name} to cart`}
                title={blocked ? "Currently unavailable" : "Add to cart"}
                className={cn(
                  "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white/90 text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-violet-soft",
                  "before:absolute before:-inset-2 before:rounded-full before:content-['']",
                  blocked && "cursor-not-allowed opacity-40 hover:border-line-strong hover:text-muted-foreground"
                )}
              >
                <ShoppingBag className="size-4" aria-hidden="true" />
              </button>
            </div>
            <AvailabilityBadge availability={item.availability} />
          </div>
        </div>
      </motion.div>
    </CardSurface>
  );
});
