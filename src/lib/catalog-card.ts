import type { CatalogItem } from "@/types";
import { originLineForLabel } from "@/lib/catalog-origin";

/**
 * CATALOG CARD PROJECTION
 * -----------------------
 * Listing pages render cards, and cards need ~12 display fields — not the
 * full CatalogItem (description, specs, variants, conformity, warnings,
 * compatibility, per-product FAQs…). Server components project to this
 * subset before handing items to client islands, so the RSC payload stops
 * carrying detail-page data for every card on every shelf.
 *
 * Two origin-variant projections ride along so multi-origin pricing is
 * correct EVERYWHERE with zero extra fetches:
 *
 *  - `variantOrigins`      — origin-variant labels (multi-origin listings
 *                            resolve EVERY sourcing line they stock — see
 *                            lib/catalog-origin).
 *  - `variantOriginPrices` — per-line ABSOLUTE AED prices (base + delta),
 *                            powering the card's price range and the
 *                            "See all origins" popup rows. The prices are
 *                            computed from variants the list endpoints
 *                            already hydrate in the same bounded IN query,
 *                            so no additional D1 reads are introduced.
 *
 * Both optional so a full CatalogItem still satisfies CatalogCardItem
 * structurally and API-backed client views (search results) flow through
 * unchanged (lib/catalog-origin.originPricesForItem reads either shape).
 */
type CatalogCardFields = Pick<
  CatalogItem,
  | "id"
  | "slug"
  | "name"
  | "brand"
  | "tagline"
  | "price"
  | "compareAtPrice"
  | "images"
  | "availability"
  | "featured"
  | "isNew"
  | "nicotineStrength"
  | "origin"
  | "categorySlug"
>;

/** Compact per-origin price row (label resolves to its line via catalog-origin). */
export interface CardOriginVariantPrice {
  label: string;
  /** Absolute AED unit price for this origin (base price + variant delta). */
  price: number;
  available: boolean;
}

export type CatalogCardItem = CatalogCardFields & {
  variantOrigins?: string[];
  variantOriginPrices?: CardOriginVariantPrice[];
};

export interface CardProjectionOptions {
  /**
   * Slug of the origin line THIS shelf is filtered by (e.g. /origin/italy).
   * When the listing stocks that line as an origin variant, the card price
   * shows THAT line's price instead of the base price — a Japan/Italy
   * listing filtered under Italy reads AED 52, not the AED 50 base. Leave
   * undefined on unfiltered shelves (discover, search, collections, brands).
   */
  activeOriginSlug?: string;
}

/** Project one catalog item down to its card-rendering fields. */
export function toCardItem(item: CatalogItem, options?: CardProjectionOptions): CatalogCardItem {
  const basePrice = item.price;
  const originVariants = item.variants.filter((variant) => variant.type === "origin");

  let price = basePrice;
  let compareAtPrice = item.compareAtPrice;

  // ACTIVE-ORIGIN RE-PRICE (origin-filtered shelves): resolve the shelf's
  // line against the origin variants — available ones preferred — and show
  // that line's price. Product-level-origin listings need no override: the
  // base price IS their line's price. The compare-at "was" price is
  // authored against the BASE configuration, so it is dropped whenever the
  // origin re-price differs — pairing it with the adjusted number would
  // fabricate a discount that does not exist.
  if (options?.activeOriginSlug) {
    const matches = originVariants.filter(
      (variant) => originLineForLabel(variant.label)?.slug === options.activeOriginSlug
    );
    const match = matches.find((variant) => variant.available) ?? matches[0];
    if (match) {
      const originPrice = basePrice + (match.priceDelta ?? 0);
      if (originPrice !== basePrice) {
        price = originPrice;
        compareAtPrice = undefined;
      }
    }
  }

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    brand: item.brand,
    tagline: item.tagline,
    price,
    compareAtPrice,
    images: item.images,
    availability: item.availability,
    featured: item.featured,
    isNew: item.isNew,
    nicotineStrength: item.nicotineStrength,
    origin: item.origin,
    // Origin-type variant labels — compact so the RSC payload stays small
    // while multi-origin cards still resolve EVERY sourcing line they
    // stock (chips + filters + landing pages, see lib/catalog-origin).
    variantOrigins: originVariants.map((variant) => variant.label),
    // Per-origin absolute prices — the card grid shows the true range and
    // the "See all origins" popup shows the exact price per sourcing line
    // without any additional request.
    variantOriginPrices: originVariants.map((variant) => ({
      label: variant.label,
      price: basePrice + (variant.priceDelta ?? 0),
      available: variant.available,
    })),
    categorySlug: item.categorySlug,
  };
}

/** Project a list (order-preserving) for grid rendering. */
export function toCardItems(items: CatalogItem[], options?: CardProjectionOptions): CatalogCardItem[] {
  return items.map((item) => toCardItem(item, options));
}
