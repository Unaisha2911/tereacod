"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { ItemGrid } from "./item-grid";
import type { CatalogCardItem } from "@/lib/catalog-card";
import { cn } from "@/lib/utils";

/**
 * LoadMoreGrid — progressive product grid.
 *
 * Replaces numbered pagination on every public listing page: the grid
 * renders the items the caller has made visible (initial batch of 16)
 * and a single "Load more" button reveals/fetches the next batch.
 * Fully controlled — the caller owns the slicing (in-memory lists) or
 * page accumulation (API-backed lists) and reports `hasMore`/`loading`.
 */
export function LoadMoreGrid({
  items,
  total,
  hasMore,
  onLoadMore,
  loading = false,
  columns = 3,
  emptyTitle = "No items found",
  emptyBody = "Try adjusting your filters or search terms.",
  loadMoreLabel = "Load more products",
  pageSize = 16,
  className,
}: {
  /** Items currently visible in the grid. */
  items: CatalogCardItem[];
  /** Total number of items available in this list. */
  total: number;
  /** Whether more items can still be revealed/fetched. */
  hasMore: boolean;
  /** Reveal or fetch the next batch. */
  onLoadMore: () => void;
  /** True while the next batch is being fetched. */
  loading?: boolean;
  columns?: 3 | 4;
  emptyTitle?: string;
  emptyBody?: string;
  loadMoreLabel?: string;
  /** Batch size the caller reveals per load — keeps the +N badge honest. */
  pageSize?: number;
  className?: string;
}) {
  const remaining = Math.max(0, total - items.length);

  return (
    <div className={className}>
      <ItemGrid items={items} columns={columns} emptyTitle={emptyTitle} emptyBody={emptyBody} />

      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            aria-label={`${loadMoreLabel} — ${remaining} more available`}
            className={cn(
              "group inline-flex min-h-12 items-center gap-2.5 rounded-full border border-line-strong bg-foreground/[0.03] px-8",
              "text-sm font-medium text-foreground shadow-[0_0_12px_rgba(139,92,246,0.12)] transition-all",
              "hover:border-violet-glow/55 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:pointer-events-none disabled:opacity-60"
            )}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin text-violet-soft" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4 text-violet-soft transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
            )}
            {loading ? "Loading…" : loadMoreLabel}
            <span className="rounded-full bg-violet-glow/15 px-2.5 py-0.5 text-[0.72rem] font-semibold text-violet-soft">
              +{Math.min(pageSize, remaining)}
            </span>
          </button>
          <p aria-live="polite" className="text-[0.78rem] text-muted-foreground">
            Showing {items.length} of {total} {total === 1 ? "product" : "products"} · {remaining} more
          </p>
        </div>
      )}
    </div>
  );
}
