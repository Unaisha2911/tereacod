"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConsolePath } from "@/components/shared/console-path";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { adminService } from "@/services/admin";
import type { OrderStatus, OrderSummary } from "@/types";
import { DataTable, FilterBar, Pagination, SearchField, type Column } from "@/components/shared/admin-primitives";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { formatDateTime } from "@/lib/format";

type OrderRow = OrderSummary & { id: string };

const STATUS_OPTIONS: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "placed", label: "Placed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      <div className="skeleton-sheen h-11 rounded-xl border border-line bg-foreground/[0.02]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-sheen h-14 rounded-xl border border-line bg-foreground/[0.02]" />
      ))}
    </div>
  );
}

export function OrdersView() {
  const basePath = useConsolePath();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(true);
  const [attempt, setAttempt] = useState(0);

  // Debounced search — the query hits the server, so throttle keystrokes.
  // Only bump `refreshing` when the committed value actually changes, so a
  // type-then-revert within the window cannot dim the table forever.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      setSearch((prev) => { if (prev !== next) setRefreshing(true); return next; });
      setPage((prev) => { if (prev !== 1) setRefreshing(true); return 1; });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let alive = true;
    adminService
      .orders({ status: status === "all" ? undefined : status, search: search || undefined, page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (alive) {
          setOrders(result.items.map((o) => ({ ...o, id: o.reference })));
          setTotal(result.total);
          setState("ready");
        }
      })
      .catch(() => {
        if (alive) setState("error");
      })
      .finally(() => {
        if (alive) setRefreshing(false);
      });
    return () => {
      alive = false;
    };
  }, [status, search, page, attempt]);

  const retry = useCallback(() => {
    setState("loading");
    setRefreshing(true);
    setAttempt((a) => a + 1);
  }, []);

  const onStatus = useCallback((next: OrderStatus | "all") => {
    setStatus(next);
    setPage(1);
    setRefreshing(true);
  }, []);

  const gotoPage = useCallback((next: number) => {
    setPage(next);
    setRefreshing(true);
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = useMemo<Column<OrderRow>[]>(
    () => [
      {
        key: "reference",
        header: "Reference",
        cell: (o) => (
          <Link
            href={`${basePath}/orders/${o.reference}`}
            className="font-mono text-[0.82rem] font-medium text-foreground underline-offset-4 hover:text-violet-soft hover:underline"
          >
            {o.reference}
          </Link>
        ),
      },
      {
        key: "placedAt",
        header: "Placed",
        cell: (o) => <span className="text-muted-foreground">{formatDateTime(o.placedAt)}</span>,
      },
      {
        key: "items",
        header: "Items",
        cell: (o) => (
          <div>
            <span className="font-medium text-foreground">{o.itemCount}</span>
            <span className="ml-2 hidden text-[0.78rem] text-muted-foreground lg:inline">
              {o.itemsPreview.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
            </span>
          </div>
        ),
      },
      { key: "status", header: "Status", cell: (o) => <OrderStatusBadge status={o.status} /> },
      { key: "totalLabel", header: "Total", cell: (o) => <span className="font-medium text-foreground">{o.totalLabel}</span> },
    ],
    [basePath]
  );

  const mobileCard = useCallback(
    (o: OrderRow) => (
      <div className="rounded-2xl border border-line bg-elevated/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`${basePath}/orders/${o.reference}`}
            className="font-mono text-[0.85rem] font-medium text-foreground underline-offset-4 hover:text-violet-soft hover:underline"
          >
            {o.reference}
          </Link>
          <OrderStatusBadge status={o.status} />
        </div>
        <p className="mt-1.5 text-[0.78rem] text-muted-foreground">Placed {formatDateTime(o.placedAt)}</p>
        <p className="mt-1.5 text-[0.82rem] text-foreground">{o.itemsPreview.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
        <div className="mt-2.5 flex items-center justify-between text-[0.8rem]">
          <span className="text-muted-foreground">{o.itemCount} item{o.itemCount === 1 ? "" : "s"}</span>
          <span className="font-medium text-foreground">{o.totalLabel}</span>
        </div>
      </div>
    ),
    [basePath]
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-violet-soft">People</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Orders</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Orders placed on the storefront — references, items, status and totals. Search by reference, email or
          customer name; status transitions are audited.
        </p>
      </header>

      <PrototypeNotice>Live order records — search, filters and pagination are served by the orders API.</PrototypeNotice>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchField
          value={searchInput}
          onChange={setSearchInput}
          label="Search orders by reference, email or customer name"
          placeholder="Search reference, email or name…"
          className="w-full lg:w-80"
        />
        {state === "ready" && (
          <p className="text-[0.78rem] text-muted-foreground" aria-live="polite">
            {total} order{total === 1 ? "" : "s"}
            {search || status !== "all" ? " matched" : ""}
          </p>
        )}
      </div>

      <FilterBar options={STATUS_OPTIONS} value={status} onChange={onStatus} ariaLabel="Filter orders by status" />

      {state === "loading" && <TableSkeleton />}
      {state === "error" && (
        <ErrorState
          title="Orders unavailable"
          body="The order service could not be reached. Try again to reload the records."
          onRetry={retry}
        />
      )}
      {state === "ready" && orders.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title="No orders match"
          body="No orders match the current search or status filter. Choose All or clear the search to see every order."
        />
      )}
      {state === "ready" && orders.length > 0 && (
        <>
          <div className={refreshing ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
            <DataTable
              columns={columns}
              rows={orders}
              caption="Order records with reference, placement date, items, status and total"
              mobileCard={mobileCard}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Pagination page={page} pageCount={pageCount} onChange={gotoPage} ariaLabel="Order pages" />
            <p className="text-[0.72rem] text-muted-foreground">
              Page {Math.min(page, pageCount)} of {pageCount} · {total} total
            </p>
          </div>
        </>
      )}
    </div>
  );
}
