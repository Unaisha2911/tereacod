"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { pressTap } from "@/lib/motion";
import { Bookmark, BookmarkCheck, ImageOff, ShoppingBag } from "lucide-react";
import { memo, useState } from "react";
import { AvailabilityBadge } from "./status-badge";
import { GlowSurface } from "@/components/atmosphere/glow-surface";
import { savedItemsService, useSavedItems } from "@/services/saved-items";
import { cartService } from "@/services/cart";
import { ensureCatalogSubset } from "@/lib/client-catalog";
import { originLinesForItem } from "@/lib/catalog-origin";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import type { CatalogCardItem } from "@/lib/catalog-card";
import { formatAED, cn } from "@/lib/utils";

/**
 * ItemCard — reusable catalog card.
 * Image + failure state, brand/name, metadata, price, availability,
 * saved control + quick-add (API-backed stores), pointer + keyboard interaction.
 */
export const ItemCard = memo(function ItemCard({ item, priority = false }: { item: CatalogCardItem; priority?: boolean }) {
  const reduced = useReducedMotion();
  const router = useRouter();
  const { toast } = useToast();
  const [imgFailed, setImgFailed] = useState(false);
  // Subscribed from the shared store (not a local snapshot) so every card
  // rendering the same item stays in sync with the product page toggle.
  const saved = useSavedItems((s) => s.items.some((i) => i.itemId === item.id));

  const blocked = item.availability === "out_of_stock" || item.availability === "unavailable";
  // EVERY sourcing line the listing belongs to — multi-origin listings
  // (product-level origin + origin variants) show one chip per line, so
  // the shelf matches the variant options on the product detail page.
  // Shared logic with the origin filter chips / landing pages, so a
  // product always shows the same origins everywhere it is listed.
  const originLines = originLinesForItem(item);

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
      // Mirror the product page's pre-selected configuration (first available
      // option of EVERY group — colour AND origin) and use its delta-adjusted
      // unit price in the confirmation: an origin option with a premium must
      // not be announced at the base price.
      const config = cartService.defaultVariantConfig(item.slug);
      cartService.addItem(item.slug, config?.variantId ?? null, 1);
      toast({
        title: "Added to cart",
        description: `${item.name} · ${formatAED(config?.unitPrice ?? item.price)}`,
        action: <ToastAction altText="View cart" onClick={() => router.push("/cart")}>View cart</ToastAction>,
      });
    })();
  };

  return (
    <GlowSurface
      as="article"
      className="h-full rounded-2xl border border-line bg-elevated/50 transition-colors duration-300 hover:border-violet-glow/35"
    >
      <motion.div
        whileHover={reduced ? undefined : { y: -4 }}
        whileTap={pressTap}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="flex h-full flex-col"
      >
        <Link
          href={`/products/${item.slug}`}
          className="group relative block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50 ring-offset-2 ring-offset-background"
          aria-label={`${item.brand} ${item.name} — view product information`}
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-gradient-to-b from-white/[0.045] to-transparent">
            {!imgFailed && item.images[0] ? (
              <Image
                src={item.images[0]}
                alt={`${item.brand} ${item.name}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={priority}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageOff className="size-6" aria-hidden="true" />
                <span className="text-meta uppercase tracking-[0.14em]">Image unavailable</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0c0912] to-transparent" aria-hidden="true" />
            {item.isNew && (
              <span className="absolute left-3 top-3 rounded-full bg-ice/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ice backdrop-blur-sm">
                New
              </span>
            )}
            {originLines.length > 0 && (
              <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
                {originLines.map((line) => (
                  <span
                    key={line.slug}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-black/60 px-2.5 py-1 text-[0.65rem] font-semibold text-foreground backdrop-blur-sm"
                    title={`Origin: ${line.label}`}
                  >
                    <span aria-hidden="true" className="text-[0.8rem] leading-none">{line.flag}</span>
                    {line.chipLabel}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>

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
            saved ? "border-violet-glow/50 bg-violet-glow/30 text-violet-soft" : "border-line-strong bg-black/60 text-muted-foreground hover:text-foreground"
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
            <Link href={`/products/${item.slug}`} className="transition-colors hover:text-violet-soft">
              {item.name}
            </Link>
          </h3>
          <p className="line-clamp-2 text-[0.82rem] leading-relaxed text-muted-foreground">{item.tagline}</p>
          <div className="mt-auto space-y-2.5 pt-2">
            {/* Price row + quick-add */}
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-[1.02rem] font-semibold text-foreground">
                {formatAED(item.price)}
                {item.compareAtPrice !== undefined && (
                  <span className="ml-2 text-[0.78rem] font-normal text-muted-foreground line-through">
                    {formatAED(item.compareAtPrice)}
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
                  "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-black/60 text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-violet-soft",
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
    </GlowSurface>
  );
});
