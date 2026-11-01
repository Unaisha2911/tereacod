"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, PackageSearch, Sparkles } from "lucide-react";
import { CardGridSkeleton } from "@/components/shared/loading-indicator";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar, Pagination, type FilterOption } from "@/components/shared/admin-primitives";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatItemsPreview } from "@/lib/format";
import { orderHistoryService } from "@/services/orders";
import { usePlacedOrders } from "@/services/placed-orders";
import type { OrderStatus, OrderSummary, Paginated } from "@/types";

const PAGE_SIZE = 10;

const STATUS_FILTERS: FilterOption<OrderStatus>[] = [
  { value: "all", label: "All" },
  { value: "placed", label: "Placed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

type ListState =
  | { key: string; state: "loading" }
  | { key: string; state: "success"; data: Paginated<OrderSummary> }
  | { key: string; state: "error" };

interface OrderQuery {
  status: "all" | OrderStatus;
  page: number;
  attempt: number;
}

const initialQuery: OrderQuery = { status: "all", page: 1, attempt: 0 };

/** Session-placed order card — links back to its checkout confirmation. */
function PlacedOrderRow({ order }: { order: OrderSummary }) {
  return (
    <li>
      <Link
        href={`/checkout/success?ref=${encodeURIComponent(order.reference)}`}
        className="group flex items-center justify-between gap-4 rounded-2xl border border-violet-glow/35 bg-violet-glow/[0.06] p-4 transition-colors hover:border-violet-glow/60 hover:bg-violet-glow/[0.1] sm:p-5"
        aria-label={`View order confirmation for ${order.reference}`}
      >
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-mono text-[0.85rem] text-foreground">
            {order.reference}
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-glow/40 bg-violet-glow/15 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-violet-soft">
              <Sparkles className="size-3" aria-hidden="true" />
              This session
            </span>
          </p>
          <p className="mt-0.5 text-[0.78rem] text-muted-foreground" suppressHydrationWarning>
            Placed {formatDate(order.placedAt)}
          </p>
          <p className="mt-1 line-clamp-1 text-[0.8rem] text-muted-foreground">
            {formatItemsPreview(order.itemsPreview, order.itemCount)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <OrderStatusBadge status={order.status} />
            <span className="text-[0.75rem] text-muted-foreground">{order.fulfilmentLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="font-display text-sm font-semibold text-foreground">{order.totalLabel}</span>
          <ChevronRight
            className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
      </Link>
    </li>
  );
}

/** Server order card — rows come from the order history API. */
function HistoryOrderRow({ order }: { order: OrderSummary }) {
  return (
    <li>
      <Link
        href={`/account/orders/${order.reference}`}
        className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-elevated/50 p-4 transition-colors hover:border-violet-glow/40 hover:bg-foreground/[0.03] sm:p-5"
        aria-label={`View order ${order.reference}`}
      >
        <div className="min-w-0">
          <p className="font-mono text-[0.85rem] text-foreground">{order.reference}</p>
          <p className="mt-0.5 text-[0.78rem] text-muted-foreground" suppressHydrationWarning>
            Placed {formatDate(order.placedAt)}
          </p>
          <p className="mt-1 line-clamp-1 text-[0.8rem] text-muted-foreground">
            {formatItemsPreview(order.itemsPreview, order.itemCount)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <OrderStatusBadge status={order.status} />
            <span className="text-[0.75rem] text-muted-foreground">{order.fulfilmentLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="font-display text-sm font-semibold text-foreground">{order.totalLabel}</span>
          <ChevronRight
            className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
      </Link>
    </li>
  );
}

export function OrdersView() {
  // Intent (what to fetch) is kept separately from the result; the
  // loading state is *derived* from a stale result key, so no setState
  // is ever called synchronously inside an effect.
  const [query, setQuery] = useState<OrderQuery>(initialQuery);
  const [result, setResult] = useState<ListState>({ key: "all-1-0", state: "loading" });
  const placedOrders = usePlacedOrders((s) => s.summaries);
  // References seen in ANY successful server fetch (across pages/filters), so
  // a session order whose server twin lives on another page is still hidden.
  // (State, not a ref — the filter reads it during render.)
  const [seenServerRefs, setSeenServerRefs] = useState<Set<string>>(() => new Set());

  const queryKey = `${query.status}-${query.page}-${query.attempt}`;
  const showLoading = result.key !== queryKey || result.state === "loading";

  useEffect(() => {
    let cancelled = false;
    const key = `${query.status}-${query.page}-${query.attempt}`;
    orderHistoryService
      .list({ status: query.status, page: query.page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) {
          setSeenServerRefs((prev) => {
            const next = new Set(prev);
            for (const item of data.items) next.add(item.reference);
            return next;
          });
          setResult({ key, state: "success", data });
        }
      })
      .catch(() => {
        if (!cancelled) setResult({ key, state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [query, queryKey]);

  const onStatusChange = (next: "all" | OrderStatus) => {
    setQuery({ status: next, page: 1, attempt: 0 });
  };

  const retry = () => {
    setResult({ key: queryKey, state: "loading" });
    setQuery((current) => ({ ...current, attempt: current.attempt + 1 }));
  };

  // Server rows win over session rows: a placed order is hidden when its
  // reference exists in the current page's history OR anywhere the customer
  // has browsed this session (avoids duplicates when the twin is on another
  // page of results).
  const serverItems = result.state === "success" ? result.data.items : [];
  const serverRefs = new Set(serverItems.map((order) => order.reference));
  const statusMatch = (order: OrderSummary) => query.status === "all" || order.status === query.status;
  const visiblePlaced = placedOrders.filter(
    (order) =>
      statusMatch(order) && !seenServerRefs.has(order.reference) && !serverRefs.has(order.reference),
  );
  const showPlaced = query.page === 1 && visiblePlaced.length > 0;
  const serverCount = serverItems.length;
  const totalCount = (result.state === "success" ? result.data.total : 0) + visiblePlaced.length;

  const pageCount = result.state === "success" ? Math.max(1, Math.ceil(result.data.total / result.data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <FilterBar
        options={STATUS_FILTERS}
        value={query.status}
        onChange={onStatusChange}
        ariaLabel="Filter orders by status"
      />

      {/* Row-shaped skeleton — matches the vertical order list below
          (a product-card grid skeleton gave the wrong shape). */}
      {showLoading && (
        <ul className="space-y-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="skeleton-sheen h-24 rounded-2xl border border-line bg-elevated/40" />
          ))}
        </ul>
      )}

      {!showLoading && result.state === "error" && (
        <ErrorState
          title="Orders unavailable"
          body="Your order history could not be loaded. Please try again."
          retryLabel="Retry"
          onRetry={retry}
        />
      )}

      {!showLoading && result.state === "success" && serverCount === 0 && visiblePlaced.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title="No orders match this filter"
          body="Orders you place at checkout appear here automatically. Clear the filter to see everything."
          actionLabel="Show all orders"
          onAction={() => onStatusChange("all")}
        />
      )}

      {!showLoading && result.state === "success" && (serverCount > 0 || visiblePlaced.length > 0) && (
        <>
          <p className="text-[0.78rem] text-muted-foreground" aria-live="polite">
            Showing {serverCount + visiblePlaced.length} of {totalCount}{" "}
            {totalCount === 1 ? "record" : "records"}
            {query.status !== "all" ? ` · filtered by ${query.status}` : ""}
          </p>

          <ul className="space-y-3">
            {showPlaced && visiblePlaced.map((order) => <PlacedOrderRow key={order.reference} order={order} />)}
            {result.data.items.map((order) => (
              <HistoryOrderRow key={order.reference} order={order} />
            ))}
          </ul>

          <Pagination
            page={query.page}
            pageCount={pageCount}
            onChange={(next) => setQuery((current) => ({ ...current, page: next }))}
            ariaLabel="Order history pages"
          />
        </>
      )}
    </div>
  );
}
