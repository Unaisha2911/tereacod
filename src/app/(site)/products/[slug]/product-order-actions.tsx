"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Zap } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { cartService } from "@/services/cart";
import { VariantPicker, initialVariantSelection, type VariantSelection } from "./variant-picker";
import type { CatalogItem } from "@/types";
import {
  combinedVariantLabel,
  joinVariantIds,
  selectedVariants,
  variantPriceDeltaTotal,
} from "@/lib/variant-selection";
import { formatAED, cn } from "@/lib/utils";
import { UspStrip } from "@/components/shared/usp-strip";

/**
 * ProductOrderActions — the ordering island for the product page.
 * Owns the variant selection (passed down to the controlled
 * VariantPicker) and the Add to cart / Buy now actions.
 * Selection can be lifted into ProductDetailShell (controlled props) so
 * the gallery can swap to the selected colour/origin photo.
 */
export function ProductOrderActions({
  item,
  selection: controlledSelection,
  onSelectionChange,
}: {
  item: CatalogItem;
  /** Controlled selection (owned by ProductDetailShell) — enables the
   *  image-swap behaviour in the gallery. */
  selection?: VariantSelection;
  onSelectionChange?: (next: VariantSelection, changedType?: string) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [internalSelection, setInternalSelection] = useState<VariantSelection>(() =>
    initialVariantSelection(item.variants)
  );
  const selection = controlledSelection ?? internalSelection;
  const setSelection = onSelectionChange ?? setInternalSelection;

  const selectedVariantsList = useMemo(
    () => selectedVariants(selection, item.variants),
    [selection, item.variants]
  );

  const productBlocked = item.availability === "out_of_stock" || item.availability === "unavailable";
  const variantBlocked = selectedVariantsList.some((variant) => !variant.available);
  const canOrder = !productBlocked && !variantBlocked;
  const optionLabel = combinedVariantLabel(selectedVariantsList);
  const displayName = optionLabel ? `${item.name} — ${optionLabel}` : item.name;
  // Price follows EVERY selected option — colour and origin deltas both apply.
  const effectivePrice = item.price + variantPriceDeltaTotal(selectedVariantsList);

  // Product-level origin (Details tab) is passed to the picker only while
  // the product has no selectable origin variants — with origin variants the
  // pills come from the variants themselves.
  const hasOriginVariants = item.variants.some((v) => v.type === "origin");
  const staticOrigin = hasOriginVariants ? undefined : item.origin;

  const addToCart = () => {
    if (!canOrder) return;
    const variantId = selectedVariantsList.length > 0 ? joinVariantIds(selectedVariantsList.map((v) => v.id)) : null;
    cartService.addItem(item.slug, variantId, 1);
    toast({
      title: "Added to cart",
      description: `${displayName} · ${formatAED(effectivePrice)}`,
      action: <ToastAction altText="View cart" onClick={() => router.push("/cart")}>View cart</ToastAction>,
    });
  };

  const buyNow = () => {
    if (!canOrder) return;
    const variantId = selectedVariantsList.length > 0 ? joinVariantIds(selectedVariantsList.map((v) => v.id)) : null;
    cartService.addItem(item.slug, variantId, 1);
    router.push("/checkout");
  };

  return (
    <>
      <VariantPicker variants={item.variants} value={selection} onChange={setSelection} origin={staticOrigin} />

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={addToCart}
            disabled={!canOrder}
            className={cn(
              "neon-glow-btn hover:neon-glow-btn-hover inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-transform hover:-translate-y-0.5",
              !canOrder && "pointer-events-none opacity-50"
            )}
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            {productBlocked ? "Currently unavailable" : "Add to cart"}
          </button>
          <button
            type="button"
            onClick={buyNow}
            disabled={!canOrder}
            className={cn(
              "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line-strong px-6 text-sm font-semibold text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]",
              !canOrder && "pointer-events-none opacity-50"
            )}
          >
            <Zap className="size-4 text-violet-soft" aria-hidden="true" />
            Buy now
          </button>
        </div>
        <div className="space-y-2.5">
          <UspStrip size="sm" />
          <p className="text-center text-[0.7rem] text-muted-foreground sm:text-left">
            18+ — ID verified at the door on every delivery.
          </p>
        </div>
      </div>
    </>
  );
}
