import type { Brand, CatalogItem, Paginated } from "@/types";
import type { SortKey } from "@/lib/catalog-sort";

/**
 * BRAND SERVICE (API-backed)
 */

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const body = (await response.json()) as { data: T };
  return body.data;
}

export const brandsService = {
  async brands(): Promise<Brand[]> {
    const data = await getJson<{ brands: Brand[] }>("/api/v1/catalog/brands");
    return data.brands;
  },

  async brand(slug: string): Promise<Brand | null> {
    const brands = await this.brands();
    return brands.find((b) => b.slug === slug) ?? null;
  },

  /** All catalog items belonging to a brand, featured-first. */
  async brandItems(slug: string, sort: SortKey = "featured"): Promise<CatalogItem[]> {
    const data = await getJson<Paginated<CatalogItem>>(
      `/api/v1/catalog/products?brand=${encodeURIComponent(slug)}&pageSize=48&sort=${encodeURIComponent(sort)}`
    );
    return data.items;
  },

  /** Item counts keyed by brand slug — used by tiles and nav badges. */
  async itemCounts(): Promise<Record<string, number>> {
    const data = await getJson<{ brands: Array<{ slug: string; productCount: number }> }>(
      "/api/v1/catalog/brands"
    );
    return Object.fromEntries(data.brands.map((b) => [b.slug, b.productCount]));
  },
};
