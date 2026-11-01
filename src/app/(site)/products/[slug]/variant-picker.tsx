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
 * VariantPicker — variant selection for a record's variants. Controlled:
 * selection state lives in ProductOrderActions so "Add to cart" always
 * agrees with what the user sees. Unavailable options are disabled with
 * an explanatory tooltip.
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
  /** Static product origin (products.origin text) — displayed as a read-only
   *  pill beside Flavour ONLY while the product has no selectable origin
   *  variants; once origins exist they render as their own group below. */
  origin?: string;
}) {
  const groups = useMemo(
    () =>
      GROUP_ORDER.map(({ type, label }) => ({
        type,
        label,
        options: variants.filter((v) => v.type === type),
      })).filter((group) => group.options.length > 0),
    [variants]
  );

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
        // Legacy display: the free-text origin shares Flavour's grid row and
        // only applies while no selectable origin variants exist.
        const showOrigin = group.type === "flavor" && Boolean(origin) && !groups.some((g) => g.type === "origin");
        return (
          <div
            key={group.type}
            className={cn(
              "grid gap-5",
              // Side by side at every width: flavour column hugs its pill,
              // origin takes the rest (its long value wraps inside the pill).
              // From sm up the split is the approved equal 50/50.
              showOrigin && "grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-2",
            )}
          >
            <fieldset className="space-y-2.5">
              <legend className="text-[0.82rem] font-medium text-foreground">{group.label}</legend>
              <div role="group" aria-label={group.label} className="flex flex-wrap gap-2">
              {group.options.map((variant) => {
                const isSelected = value[group.type] === variant.id;
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
                      !variant.available && "cursor-not-allowed line-through opacity-45 hover:border-line hover:text-muted-foreground"
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

            {/* Static origin — legacy free-text origin (Details tab) mirrors
                the Flavour group while the product has no origin variants. */}
            {showOrigin && (
              <fieldset className="space-y-2.5">
                <legend className="text-[0.82rem] font-medium text-foreground">Origin</legend>
                <div role="group" aria-label="Origin" className="flex flex-wrap gap-2">
                  <span
                    title={`Origin: ${origin}`}
                    className="inline-flex min-h-10 cursor-default items-center gap-2.5 rounded-full border border-violet-glow bg-violet-glow/15 px-4 py-2 text-[0.82rem] font-medium leading-snug text-foreground"
                  >
                    <Globe className="size-3.5 shrink-0 text-violet-soft" aria-hidden="true" />
                    {origin}
                  </span>
                </div>
              </fieldset>
            )}
          </div>
        );
      })}
    </div>
  );
}
