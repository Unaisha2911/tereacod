import type { ItemVariant } from "@/types";

/**
 * TereaCOD — variant selection helpers.
 *
 * Pure functions shared by the client ordering island (product page) and the
 * server pricing paths (cart repository, order snapshots). Kept free of
 * "use client" so server modules can import them directly.
 *
 * A visitor can pick one option from EACH independent group (flavour,
 * colour, origin, capacity, nicotine). The cart line therefore stores ALL
 * selected variant ids joined with "|" — pricing is the base price plus the
 * summed priceDelta of every selected variant.
 */

/** Display/selection order of the option groups. */
export const VARIANT_GROUP_ORDER = [
  "flavor",
  "color",
  "origin",
  "capacity",
  "nicotine",
] as const;

/** Selection state shape: group type → selected variant id. */
export type VariantSelection = Record<string, string>;

/** All selected variant ids, in VARIANT_GROUP_ORDER. */
export function selectedVariantIds(selection: VariantSelection): string[] {
  const ids: string[] = [];
  for (const type of VARIANT_GROUP_ORDER) {
    const id = selection[type];
    if (id) ids.push(id);
  }
  return ids;
}

/** All selected variants resolved against the product's variant list. */
export function selectedVariants(
  selection: VariantSelection,
  variants: ItemVariant[]
): ItemVariant[] {
  const byId = new Map(variants.map((v) => [v.id, v]));
  const resolved: ItemVariant[] = [];
  for (const id of selectedVariantIds(selection)) {
    const variant = byId.get(id);
    if (variant) resolved.push(variant);
  }
  return resolved;
}

/** First selected variant (flavour beats colour beats origin beats …). */
export function primaryVariantId(selection: VariantSelection): string | null {
  return selectedVariantIds(selection)[0] ?? null;
}

/** Default selection: the first available variant of each present group. */
export function initialVariantSelection(variants: ItemVariant[]): VariantSelection {
  const initial: VariantSelection = {};
  for (const type of VARIANT_GROUP_ORDER) {
    const firstAvailable = variants.find((v) => v.type === type && v.available);
    if (firstAvailable) initial[type] = firstAvailable.id;
  }
  return initial;
}

/** "Midnight Blue · Japan" — undefined when no options are selected. */
export function combinedVariantLabel(variants: ItemVariant[]): string | undefined {
  if (variants.length === 0) return undefined;
  return variants.map((v) => v.label).join(" · ");
}

/** Sum of the selected variants' price deltas (AED, may be negative). */
export function variantPriceDeltaTotal(variants: ItemVariant[]): number {
  return variants.reduce((sum, v) => sum + (v.priceDelta ?? 0), 0);
}

/** Cart-line storage encoding: ids joined with "|" ("a|b"). */
export function joinVariantIds(ids: string[]): string {
  return ids.join("|");
}

/** Parse a stored cart-line variant id ("a|b" → ["a", "b"]; null → []). */
export function splitVariantIds(stored: string | null): string[] {
  if (!stored) return [];
  return stored.split("|").filter(Boolean);
}
