"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/forms/fields";
import { SORT_OPTION_LIST, sortCatalogItems, type SortKey } from "@/lib/catalog-sort";
import { originCountsFor } from "@/lib/catalog-origin";
import { OriginFilterChips } from "./origin-filter-chips";
import { LoadMoreGrid } from "./load-more-grid";
import type { CatalogCardItem } from "@/lib/catalog-card";

const PAGE_SIZE = 16;

/**
 * CatalogBrowser — client island for in-memory product lists.
 *
 * Origin-line LINK chips (each lands on the line's /origin/<slug> page,
 * carrying this shelf's collection/brand as combined-facet context) +
 * sort control + a 16-per-batch Load more grid (no numbered pagination).
 * Used by collection pages, origin landing pages and brand pages; discover
 * runs its own view and search accumulates server pages instead.
 */
export function CatalogBrowser({
  items,
  showOriginFilter = false,
  /** Active sibling filters carried into the origin landing pages. */
  originFilterContext,
  showSort = true,
  columns = 3,
  emptyTitle = "No items found",
  emptyBody = "Try adjusting your filters or search terms.",
  loadMoreLabel = "Load more products",
}: {
  /** Full in-memory list for this page. */
  items: CatalogCardItem[];
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
  const [sort, setSort] = useState<SortKey>("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Facet counts — a multi-origin listing counts toward EVERY line it
  // stocks, so its chips surface on every line page it belongs to.
  const counts = useMemo(
    () => (showOriginFilter ? originCountsFor(items) : undefined),
    [items, showOriginFilter]
  );

  const sorted = useMemo(() => sortCatalogItems(items, sort), [items, sort]);
  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const hasMore = visibleCount < sorted.length;

  const onSortChange = (next: string) => {
    setSort(next as SortKey);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="space-y-6">
      {showOriginFilter && (
        <OriginFilterChips counts={counts} context={originFilterContext} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-[0.8rem] text-muted-foreground">
          {sorted.length > 0
            ? `Showing ${visible.length} of ${sorted.length} ${sorted.length === 1 ? "product" : "products"}`
            : "No products match this view"}
        </p>
        {showSort && (
          <label className="flex items-center gap-2.5 text-[0.8rem] text-muted-foreground">
            <span>Sort</span>
            <Select
              aria-label="Sort items in this list"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
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
        items={visible}
        total={sorted.length}
        hasMore={hasMore}
        onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
        columns={columns}
        emptyTitle={emptyTitle}
        emptyBody={emptyBody}
        loadMoreLabel={loadMoreLabel}
      />
    </div>
  );
}
