"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConsolePath } from "@/components/shared/console-path";
import Link from "next/link";
import { ShieldCheck, ShieldOff, ShieldQuestion, FileClock, UsersRound } from "lucide-react";
import { adminService } from "@/services/admin";
import type { AdminCustomer } from "@/types";
import { DataTable, FilterBar, Pagination, SearchField, type Column } from "@/components/shared/admin-primitives";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { formatDate } from "@/lib/format";

/* Deterministic date formatting (UTC) — identical on server and client. */
type CustomerStatusFilter = AdminCustomer["status"];

const STATUS_OPTIONS: Array<{ value: CustomerStatusFilter | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending" },
];

function StatusCell({ status }: { status: AdminCustomer["status"] }) {
  if (status === "active") return <StatusBadge tone="success" icon={ShieldCheck}>Active</StatusBadge>;
  if (status === "suspended") return <StatusBadge tone="error" icon={ShieldOff}>Suspended</StatusBadge>;
  return <StatusBadge tone="warning" icon={ShieldQuestion}>Pending</StatusBadge>;
}

function PrivacyCell({ request }: { request: AdminCustomer["privacyRequest"] }) {
  if (request === "access") return <StatusBadge tone="warning" icon={FileClock}>Access request</StatusBadge>;
  if (request === "deletion") return <StatusBadge tone="error" icon={FileClock}>Deletion request</StatusBadge>;
  return <span className="text-muted-foreground" aria-label="No privacy request">—</span>;
}

function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-foreground underline-offset-4 transition-colors hover:text-violet-soft hover:underline">
      {children}
    </Link>
  );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      <div className="skeleton-sheen h-11 rounded-xl border border-line bg-foreground/[0.02]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-sheen h-14 rounded-xl border border-line bg-foreground/[0.02]" />
      ))}
    </div>
  );
}

const PAGE_SIZE = 6;

export function CustomersView() {
  const basePath = useConsolePath();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatusFilter | "all">("all");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      setState("loading");
      adminService
        .customers({ search, status })
        .then((list) => {
          if (alive) {
            setCustomers(list);
            setState("ready");
          }
        })
        .catch(() => {
          if (alive) setState("error");
        });
    }, 220);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [search, status, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const onSearch = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  const onStatus = useCallback((next: CustomerStatusFilter | "all") => {
    setStatus(next);
    setPage(1);
  }, []);

  const columns = useMemo<Column<AdminCustomer>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        sortable: true,
        sortValue: (c) => c.name,
        cell: (c) => <RowLink href={`${basePath}/customers/${c.id}`}>{c.name}</RowLink>,
      },
      { key: "email", header: "Email", sortable: true, sortValue: (c) => c.email, cell: (c) => <span className="text-muted-foreground">{c.email}</span> },
      { key: "status", header: "Status", sortable: true, sortValue: (c) => c.status, cell: (c) => <StatusCell status={c.status} /> },
      { key: "joined", header: "Joined", sortable: true, sortValue: (c) => c.joinedAt, cell: (c) => <span className="text-muted-foreground">{formatDate(c.joinedAt)}</span> },
      { key: "ordersCount", header: "Orders", sortable: true, sortValue: (c) => c.ordersCount, className: "text-center" },
      { key: "privacy", header: "Privacy request", cell: (c) => <PrivacyCell request={c.privacyRequest} /> },
      { key: "supportTickets", header: "Tickets", sortable: true, sortValue: (c) => c.supportTickets, className: "text-center" },
    ],
    [basePath]
  );

  const pageCount = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = customers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const mobileCard = useCallback(
    (c: AdminCustomer) => (
      <div className="rounded-2xl border border-line bg-elevated/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <RowLink href={`${basePath}/customers/${c.id}`}>{c.name}</RowLink>
            <p className="mt-0.5 truncate text-[0.8rem] text-muted-foreground">{c.email}</p>
          </div>
          <StatusCell status={c.status} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.78rem] text-muted-foreground">
          <span>Joined {formatDate(c.joinedAt)}</span>
          <span>{c.ordersCount} orders</span>
          <span>{c.supportTickets} tickets</span>
        </div>
        {c.privacyRequest && (
          <div className="mt-2.5">
            <PrivacyCell request={c.privacyRequest} />
          </div>
        )}
      </div>
    ),
    [basePath]
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-violet-soft">People</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Customers</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Customer accounts registered on the storefront — status, order counts and privacy requests for the support and privacy workflows.
        </p>
      </header>

      <PrototypeNotice>
        Live customer records from the accounts database. Suspend and privacy workflows operate on real accounts.
      </PrototypeNotice>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchField
          value={search}
          onChange={onSearch}
          label="Search customers by name or email"
          placeholder="Search name or email…"
          className="w-full lg:w-80"
        />
        <FilterBar options={STATUS_OPTIONS} value={status} onChange={onStatus} ariaLabel="Filter customers by status" />
      </div>

      {state === "loading" && <TableSkeleton />}
      {state === "error" && (
        <ErrorState
          title="Customers unavailable"
          body="The customer service could not be reached. Try again to reload the records."
          onRetry={retry}
        />
      )}
      {state === "ready" && customers.length === 0 && (
        <EmptyState
          icon={UsersRound}
          title="No customers match"
          body="No customers match the current search or status filter. Clear the filters to see all records."
        />
      )}
      {state === "ready" && customers.length > 0 && (
        <>
          <DataTable
            columns={columns}
            rows={pageRows}
            initialSort={{ key: "joined", dir: "desc" }}
            caption="Customer records with status, order counts and privacy requests"
            mobileCard={mobileCard}
          />
          <div className="flex flex-col items-center gap-2">
            <Pagination page={safePage} pageCount={pageCount} onChange={setPage} ariaLabel="Customer pages" />
            <p className="text-[0.72rem] text-muted-foreground">
              Showing {customers.length} customer record{customers.length === 1 ? "" : "s"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
