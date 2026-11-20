"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Select } from "@/components/forms/fields";
import { SORT_OPTION_LIST, type SortKey } from "@/lib/catalog-sort";
import { originCountsFor } from "@/lib/catalog-origin";
import { OriginFilterChips } from "./origin-filter-chips";
import { LoadMoreGrid } from "./load-more-grid";
import { catalogService } from "@/services/catalog";
import { toCardItems } from "@/lib/catalog-card";
import type { CatalogCardItem } from "@/lib/catalog-card";

const PAGE_SIZE = 16;

/**
 * CatalogBrowser — client island for listing shelves.
 *
 * Server-rendered first batch + API-backed batches for everything after:
 * the shelf paints 16 server-rendered cards (crawlable, no first-paint
 * spinner), and every additional batch is fetched ON DEMAND — one small
 * /api/v1/catalog/products request per "Load more" click. Sort re-queries
 * the shelf server-side under the new ordering. No page downloads its
 * whole shelf up front anymore (the old full-shelf serialization was the
 * slow-card-load + Workers-CPU culprit). Used by collection, origin and
 * brand pages; discover runs its own view and search accumulates server
 * pages instead.
 */
export function CatalogBrowser({
  initialItems,
  total,
  /** Serializable shelf filter — Load-more/sort fetches reuse it. */
  query,
  showOriginFilter = false,
  /** Active sibling filters carried into the origin landing pages. */
  originFilterContext,
  showSort = true,
  columns = 3,
  emptyTitle = "No items found",
  emptyBody = "Try adjusting your filters or search terms.",
  loadMoreLabel = "Load more products",
}: {
  /** First batch (server-rendered). */
  initialItems: CatalogCardItem[];
  /** Total items on this shelf (server-counted). */
  total: number;
  /** Shelf filters echoed for API fetches: collection / brand / origin / q. */
  query?: { collection?: string; brand?: string; origin?: string; q?: string };
  /** Show the origin-line link chips (collections / brands). */
  showOriginFilter?: boolean;
  /** Carried into the origin pages: { collection, brand } of this shelf. */
  originFilterContext?: { collection?: string; brand?: string };
  /** Show the sort control (default on). */
  showSort?: boolean;
  columns?: 3 | 4;
  emptyTitle?: string;
  emptyBody?: string;
  loadMoreLabel?: string;
}) {
  const [items, setItems] = useState<CatalogCardItem[]>(initialItems);
  const [totalCount, setTotalCount] = useState(total);
  const [sort, setSort] = useState<SortKey>("featured");
  const [loading, setLoading] = useState(false);
  // Guards against a superseded request writing stale results (sort race).
  const requestIdRef = useRef(0);

  // The island remounts per navigation (each server page renders a fresh
  // element), so props are stable for this component's lifetime.
  const fetchBatch = useCallback(
    async (page: number, sortKey: SortKey, mode: "replace" | "append") => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const data = await catalogService.items({
          ...query,
          sort: sortKey,
          page,
          pageSize: PAGE_SIZE,
        });
        if (requestId !== requestIdRef.current) return; // a newer request superseded this one
        const cards = toCardItems(data.items);
        setTotalCount(data.total);
        setItems((prev) => (mode === "append" && page > 1 ? [...prev, ...cards] : cards));
      } catch {
        // Keep the last-good list — the Load more button stays available so
        // the next click retries the same batch.
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [query]
  );

  const onLoadMore = () => {
    void fetchBatch(Math.floor(items.length / PAGE_SIZE) + 1, sort, "append");
  };

  const onSortChange = (next: string) => {
    const sortKey = next as SortKey;
    setSort(sortKey);
    // Server-side sort: refetch the first batch under the new ordering
    // (the Load-more batch sequence restarts from there).
    void fetchBatch(1, sortKey, "replace");
  };

  // Facet counts — a multi-origin listing counts toward EVERY line it
  // stocks. Computed over the ACCUMULATED batches (same contract as the
  // search page), so chips reflect the products the visitor has seen.
  const counts = useMemo(
    () => (showOriginFilter ? originCountsFor(items) : undefined),
    [items, showOriginFilter]
  );

  const hasMore = items.length < totalCount && !loading;

  return (
    <div className="space-y-6">
      {showOriginFilter && <OriginFilterChips counts={counts} context={originFilterContext} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-[0.8rem] text-muted-foreground">
          {totalCount > 0
            ? `Showing ${Math.min(items.length, totalCount)} of ${totalCount} ${totalCount === 1 ? "product" : "products"}`
            : "No products match this view"}
        </p>
        {showSort && (
          <label className="flex items-center gap-2.5 text-[0.8rem] text-muted-foreground">
            <span>Sort</span>
            <Select
              aria-label="Sort items in this list"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              disabled={loading}
              className="h-11 w-52 text-[0.8rem]"
            >
              {SORT_OPTION_LIST.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      <LoadMoreGrid
        items={items}
        total={totalCount}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        loading={loading}
        columns={columns}
        emptyTitle={emptyTitle}
        emptyBody={emptyBody}
        loadMoreLabel={loadMoreLabel}
      />
    </div>
  );
}
