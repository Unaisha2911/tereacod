"use client";

import { useMemo } from "react";
import { Globe } from "lucide-react";
import { RadioGroup } from "@/components/forms/fields";
import type { ItemVariant } from "@/types";
import { cn } from "@/lib/utils";
import {
  initialVariantSelection,
  primaryVariantId,
  type VariantSelection,
} from "@/lib/variant-selection";

export { initialVariantSelection, primaryVariantId };
export type { VariantSelection };

const GROUP_ORDER: Array<{ type: ItemVariant["type"]; label: string }> = [
  { type: "flavor", label: "Flavour" },
  { type: "color", label: "Colour" },
  { type: "origin", label: "Origin" },
  { type: "capacity", label: "Option" },
  { type: "nicotine", label: "Nicotine strength" },
];

/**
 * Synthetic id for the origin option generated from the product-level
 * origin (admin Details dropdown → products.origin). When a listing has no
 * selectable origin variants, its Details origin is injected as an Origin
 * option so it renders through the EXACT same pill group as variant-page
 * origins — same group, same position in the option order, same button,
 * same interaction.
 *
 * It is not backed by a product_variants row: it carries no price delta
 * (the product's base price already IS that origin's price) and it never
 * resolves against the real variant list, so it stays out of cart lines —
 * a single-origin product orders the base product, exactly like a product
 * with no options at all.
 */
const PRODUCT_ORIGIN_ID = "__product_origin__";

const isProductOrigin = (variant: ItemVariant) => variant.id === PRODUCT_ORIGIN_ID;

/**
 * VariantPicker — variant selection for a record's variants. Controlled:
 * selection state lives in ProductOrderActions so "Add to cart" always
 * agrees with what the user sees. Unavailable options are disabled with
 * an explanatory tooltip.
 *
 * The Details-tab origin is counted as an Origin option whenever the
 * product has no origin variants, so both sourcing paths render and
 * behave identically: origin added on the Variants tab becomes a
 * selectable group; origin picked on the Details tab becomes a single
 * always-selected pill in the same group, with the same button and
 * interaction model.
 */
export function VariantPicker({
  variants,
  value,
  onChange,
  origin,
}: {
  variants: ItemVariant[];
  value: VariantSelection;
  /** `changedType` is the group whose pill was clicked — re-clicking a
   *  selected colour/origin re-applies its photo (idempotent highlight). */
  onChange: (next: VariantSelection, changedType?: ItemVariant["type"]) => void;
  /** Product-level origin (Details tab → products.origin). Injected as an
   *  Origin option (same pill group as variant origins) when no origin
   *  variants exist. */
  origin?: string;
}) {
  const groups = useMemo(() => {
    const base = GROUP_ORDER.map(({ type, label }) => ({
      type,
      label,
      options: variants.filter((v) => v.type === type),
    })).filter((group) => group.options.length > 0);

    const hasOriginVariants = variants.some((v) => v.type === "origin");
    if (!hasOriginVariants && origin) {
      const synthetic: ItemVariant = {
        id: PRODUCT_ORIGIN_ID,
        label: origin,
        type: "origin",
        available: true,
      };
      const group = { type: "origin" as const, label: "Origin", options: [synthetic] };
      // Keep GROUP_ORDER: insert before the first group that ranks after
      // "origin" (capacity / nicotine), else append.
      const originRank = GROUP_ORDER.findIndex((g) => g.type === "origin");
      const insertAt = base.findIndex(
        (g) => GROUP_ORDER.findIndex((o) => o.type === g.type) > originRank
      );
      if (insertAt === -1) base.push(group);
      else base.splice(insertAt, 0, group);
    }

    return base;
  }, [variants, origin]);

  if (groups.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line-strong px-4 py-3 text-[0.82rem] text-muted-foreground">
        This product ships in a single configuration.
      </p>
    );
  }

  return (
    <div role="group" aria-label="Product options" className="space-y-5">
      {groups.map((group) => {
        if (group.type === "nicotine") {
          return (
            <RadioGroup
              key={group.type}
              name={`variant-${group.type}`}
              label={group.label}
              value={value[group.type] ?? ""}
              onChange={(next) => onChange({ ...value, [group.type]: next }, group.type)}
              options={group.options.map((v) => ({
                value: v.id,
                label: v.label,
                description: v.available ? v.meta : (v.meta ?? "Currently unavailable"),
              }))}
            />
          );
        }

        const hasUnavailable = group.options.some((v) => !v.available);
        return (
          <fieldset key={group.type} className="space-y-2.5">
            <legend className="text-[0.82rem] font-medium text-foreground">{group.label}</legend>
            <div role="group" aria-label={group.label} className="flex flex-wrap gap-2">
              {group.options.map((variant) => {
                // The Details-origin option behaves exactly like a variant
                // origin pill: same button, same hover, same pressed state,
                // same click path. It is always "selected" (it is the
                // product's only origin) and stays out of the cart line —
                // a one-option origin group is a no-op click either way.
                const isProduct = isProductOrigin(variant);
                const isSelected = isProduct || value[group.type] === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!variant.available}
                    title={
                      variant.available
                        ? variant.label
                        : `${variant.label} — ${variant.meta ?? "currently unavailable"}`
                    }
                    onClick={() => onChange({ ...value, [group.type]: variant.id }, group.type)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2.5 rounded-full border px-4 text-[0.82rem] font-medium transition-colors",
                      isSelected
                        ? "border-violet-glow bg-violet-glow/15 text-foreground"
                        : "border-line text-muted-foreground hover:border-line-strong hover:text-foreground",
                      !variant.available &&
                        "cursor-not-allowed line-through opacity-45 hover:border-line hover:text-muted-foreground"
                    )}
                  >
                    {variant.swatch && (
                      <span
                        aria-hidden="true"
                        className="size-3.5 shrink-0 rounded-full border border-white/20"
                        style={{ backgroundColor: variant.swatch }}
                      />
                    )}
                    {group.type === "origin" && (
                      <Globe className="size-3.5 shrink-0 text-violet-soft" aria-hidden="true" />
                    )}
                    {variant.label}
                  </button>
                );
              })}
            </div>
            {hasUnavailable && (
              <p className="text-[0.72rem] text-muted-foreground">Struck-through options are currently unavailable.</p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
