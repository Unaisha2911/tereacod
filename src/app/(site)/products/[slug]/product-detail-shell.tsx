"use client";

import { useState, type ReactNode } from "react";
import { ItemGallery } from "@/components/shared/item-gallery";
import { AvailabilityBadge } from "@/components/shared/status-badge";
import { ProductOrderActions } from "./product-order-actions";
import { ProductSaveButton } from "./product-save-button";
import { SelectedOriginChip } from "./selected-origin-chip";
import { initialVariantSelection, type VariantSelection } from "./variant-picker";
import {
  selectedVariants,
  variantPriceDeltaTotal,
} from "@/lib/variant-selection";
import { formatAED } from "@/lib/utils";
import type { OriginChipData } from "@/lib/catalog-origin";
import type { CatalogItem } from "@/types";

/**
 * ProductDetailShell — client wrapper around the product page's two-column
 * grid. Owns the variant selection so the gallery (left column) and the
 * order actions (right column) stay in sync: picking a colour or origin
 * pill promotes that option's photo to the front of the gallery.
 *
 * The highlighted photo follows the option the visitor touched last:
 * choosing a colour/origin swaps the image, choosing a flavour keeps the
 * current photo (flavours never change how the product looks), and picking
 * a colour/origin without a photo restores the default catalog order.
 *
 * The price block is rendered HERE (not in the server children) so it can
 * react to the selection: a colour or origin option with its own price
 * delta updates the displayed price immediately. `belowPrice` receives the
 * server-rendered rows that belong under the price.
 *
 * The badge row (availability + origin chip + nicotine + save) also lives
 * HERE: the origin chip must follow the selected Origin pill, and selection
 * state is owned by this component — server children cannot react to it.
 */
export function ProductDetailShell({
  item,
  children,
  belowPrice,
  originChip,
}: {
  item: CatalogItem;
  children: ReactNode;
  /** Server-rendered rows shown under the reactive price (SKU, badges). */
  belowPrice?: ReactNode;
  /** Compact origin-line resolution table for the reactive origin chip. */
  originChip: OriginChipData;
}) {
  const [selection, setSelection] = useState<VariantSelection>(() => initialVariantSelection(item.variants));
  /** Photo of the last-touched colour/origin with imagery; null = default order. */
  const [highlightImage, setHighlightImage] = useState<string | null>(null);

  const selected = selectedVariants(selection, item.variants);
  const priceDelta = variantPriceDeltaTotal(selected);
  const effectivePrice = item.price + priceDelta;

  const handleSelectionChange = (next: VariantSelection, changedType?: string) => {
    setSelection(next);
    if (changedType === "color" || changedType === "origin") {
      const variant = item.variants.find((v) => v.id === next[changedType]);
      setHighlightImage(variant?.imageUrl ?? null);
    }
    // Other groups (flavour/capacity/nicotine) never drive imagery, and
    // re-clicking a selected colour/origin re-applies its photo.
  };

  return (
    <div className="grid gap-10 pt-8 lg:grid-cols-2">
      {/* Gallery */}
      <div>
        <ItemGallery images={item.images} name={item.name} highlightImage={highlightImage ?? undefined} />
      </div>

      {/* Info column — server content, reactive price, then ordering island. */}
      <div className="flex flex-col gap-5">
        {children}

        {/* Price — follows the selected options (colour + origin deltas
            both apply). Formatted AED with optional strikethrough "was". */}
        <div className="flex flex-wrap items-baseline gap-3" aria-label={`Price ${formatAED(effectivePrice)}`}>
          <span className="font-display text-3xl font-bold tracking-tight text-foreground">
            {formatAED(effectivePrice)}
          </span>
          {item.compareAtPrice !== undefined && item.compareAtPrice - effectivePrice > 0 && (
            <>
              <span className="text-lg text-muted-foreground line-through decoration-error/60">
                {formatAED(item.compareAtPrice)}
              </span>
              <span className="rounded-full border border-success/35 bg-success/10 px-2.5 py-1 text-[0.72rem] font-semibold text-success">
                Save {formatAED(item.compareAtPrice - effectivePrice)}
              </span>
            </>
          )}
        </div>
        {belowPrice}

        {/* Badge row — availability, the SELECTION-REACTIVE origin chip
            (flips flag/label/link when an Origin pill is pressed), the
            nicotine tag and the save control. Rendered by the shell (not
            server children) because it tracks selection state. */}
        <div className="flex flex-wrap items-center gap-2">
          <AvailabilityBadge availability={item.availability} />
          <SelectedOriginChip data={originChip} selectedVariantId={selection.origin} />
          {item.nicotineStrength && (
            <span className="inline-flex items-center rounded-full border border-line px-2.5 py-1 text-[0.72rem] font-medium tracking-wide text-muted-foreground">
              {item.nicotineStrength}
            </span>
          )}
          <ProductSaveButton itemId={item.id} name={item.name} />
        </div>

        <ProductOrderActions item={item} selection={selection} onSelectionChange={handleSelectionChange} />
      </div>
    </div>
  );
}
