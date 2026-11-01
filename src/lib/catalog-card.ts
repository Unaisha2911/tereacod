import type { CatalogItem } from "@/types";

/**
 * CATALOG CARD PROJECTION
 * -----------------------
 * Listing pages render cards, and cards need ~12 display fields — not the
 * full CatalogItem (description, specs, variants, conformity, warnings,
 * compatibility, per-product FAQs…). Server components project to this
 * subset before handing items to client islands, so the RSC payload stops
 * carrying detail-page data for every card on every shelf.
 *
 * Structural: a full CatalogItem still satisfies CatalogCardItem, so
 * API-backed client views (search results) flow through unchanged.
 */
export type CatalogCardItem = Pick<
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

/** Project one catalog item down to its card-rendering fields. */
export function toCardItem(item: CatalogItem): CatalogCardItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    brand: item.brand,
    tagline: item.tagline,
    price: item.price,
    compareAtPrice: item.compareAtPrice,
    images: item.images,
    availability: item.availability,
    featured: item.featured,
    isNew: item.isNew,
    nicotineStrength: item.nicotineStrength,
    origin: item.origin,
    categorySlug: item.categorySlug,
  };
}

/** Project a list (order-preserving) for grid rendering. */
export function toCardItems(items: CatalogItem[]): CatalogCardItem[] {
  return items.map(toCardItem);
}
