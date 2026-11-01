import type { CatalogCategory, CatalogItem, Paginated } from "@/types";
import type { SortKey } from "@/lib/catalog-sort";
import { findByIdInCatalog } from "@/lib/client-catalog";

/**
 * CATALOG SERVICE (API-backed)
 * ----------------------------
 * Client views consume these typed helpers; every call hits /api/v1/catalog.
 * Signatures match the original mock contract (see docs/FUTURE-BACKEND.md).
 */

export interface CatalogQuery {
  categorySlug?: string;
  brandSlug?: string;
  query?: string;
  sort?: SortKey;
  availability?: CatalogItem["availability"] | "all";
  /** Origin-line slug filter (japan / indonesia / duty-free). */
  originSlug?: string;
  page?: number;
  pageSize?: number;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const body = (await response.json()) as { data: T };
  return body.data;
}

export const catalogService = {
  async categories(): Promise<CatalogCategory[]> {
    const data = await getJson<{ collections: CatalogCategory[] }>("/api/v1/catalog/categories");
    return data.collections;
  },

  async category(slug: string): Promise<CatalogCategory | null> {
    const categories = await this.categories();
    return categories.find((c) => c.slug === slug) ?? null;
  },

  async items(query: CatalogQuery = {}): Promise<Paginated<CatalogItem>> {
    const params = new URLSearchParams();
    if (query.categorySlug) params.set("collection", query.categorySlug);
    if (query.brandSlug) params.set("brand", query.brandSlug);
    if (query.query) params.set("q", query.query);
    if (query.sort) params.set("sort", query.sort);
    if (query.availability && query.availability !== "all") params.set("availability", query.availability);
    if (query.originSlug) params.set("origin", query.originSlug);
    params.set("page", String(query.page ?? 1));
    params.set("pageSize", String(query.pageSize ?? 9));
    return getJson<Paginated<CatalogItem>>(`/api/v1/catalog/products?${params.toString()}`);
  },

  async item(slug: string): Promise<CatalogItem | null> {
    try {
      return await getJson<CatalogItem>(`/api/v1/catalog/products/${encodeURIComponent(slug)}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) return null;
      throw error;
    }
  },

  async related(slug: string): Promise<CatalogItem[]> {
    const data = await getJson<{ items: CatalogItem[] }>(
      `/api/v1/catalog/products/${encodeURIComponent(slug)}/related`
    );
    return data.items;
  },

  /** Resolve saved item ids → catalog items via the client mirror. */
  async itemsByIds(ids: string[]): Promise<CatalogItem[]> {
    return ids
      .map((id) => findByIdInCatalog(id))
      .filter((item): item is CatalogItem => Boolean(item));
  },

  /** Simple suggestion helper for the search UI (server prefix search). */
  async suggest(
    partial: string,
    limit = 6
  ): Promise<Array<{ slug: string; name: string; brand: string; category: string }>> {
    if (!partial.trim()) return [];
    const data = await getJson<{ suggestions: Array<{ slug: string; name: string; brand: string; category: string }> }>(
      `/api/v1/search/suggest?q=${encodeURIComponent(partial.trim())}`
    );
    return data.suggestions.slice(0, limit);
  },
};
