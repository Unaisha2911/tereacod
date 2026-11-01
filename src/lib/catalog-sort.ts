import type { CatalogItem } from "@/types";

/**
 * SHARED CATALOG SORT
 * -------------------
 * Single source for sort keys, option labels and the comparator used
 * by the discover grid, collection pages, brand pages and the mock
 * catalog service. Future backend: these keys map 1:1 to ORDER BY
 * clauses, so client and API stay in vocabulary sync.
 */

export type SortKey = "featured" | "name-asc" | "name-desc" | "newest" | "price-asc" | "price-desc";

export interface SortOption {
  value: SortKey;
  label: string;
}

/** The canonical sort options, in display order. */
export const SORT_OPTIONS: readonly SortOption[] = [
  { value: "featured", label: "Featured" },
  { value: "name-asc", label: "A\u2013Z" },
  { value: "name-desc", label: "Z\u2013A" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

/** Alias for call sites that read more naturally as an option list. */
export const SORT_OPTION_LIST: readonly SortOption[] = SORT_OPTIONS;

/** Minimal shape the comparators touch — works for full items and card projections. */
type SortableItem = Pick<CatalogItem, "name" | "price" | "featured" | "isNew">;

const byName = (a: SortableItem, b: SortableItem) => a.name.localeCompare(b.name);
const featuredFirst = (a: SortableItem, b: SortableItem) =>
  Number(b.featured ?? false) - Number(a.featured ?? false);

/**
 * Sort a catalog list by the shared keys. Pure — returns a new array;
 * the input order is never mutated.
 *
 * - featured   → featured items first, then alphabetical
 * - newest     → new arrivals first, then featured-first, then name
 * - price-*    → by price, then name for stable ties
 */
export function sortCatalogItems<T extends SortableItem>(items: T[], sort: SortKey = "featured"): T[] {
  const sorted = [...items];
  switch (sort) {
    case "name-asc":
      return sorted.sort(byName);
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "newest":
      return sorted.sort(
        (a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false) || featuredFirst(a, b) || byName(a, b)
      );
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price || byName(a, b));
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price || byName(a, b));
    case "featured":
    default:
      return sorted.sort((a, b) => featuredFirst(a, b) || byName(a, b));
  }
}
