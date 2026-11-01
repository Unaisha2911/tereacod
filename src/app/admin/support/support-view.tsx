"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConsolePath } from "@/components/shared/console-path";
import { LifeBuoy } from "lucide-react";
import { adminService } from "@/services/admin";
import type { SupportTicket, TicketPriority, TicketStatus } from "@/types";
import { DataTable, FilterBar, SearchField, type Column } from "@/components/shared/admin-primitives";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

const STATUS_OPTIONS: Array<{ value: TicketStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS: Array<{ value: TicketPriority | "all"; label: string }> = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

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

export function SupportView() {
  const basePath = useConsolePath();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [priority, setPriority] = useState<TicketPriority | "all">("all");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    adminService
      .tickets()
      .then((list) => {
        if (alive) {
          setTickets(list);
          setState("ready");
        }
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState("loading");
    setAttempt((a) => a + 1);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        t.requester.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, status, priority]);

  const columns = useMemo<Column<SupportTicket>[]>(
    () => [
      {
        key: "reference",
        header: "Reference",
        sortable: true,
        sortValue: (t) => t.reference,
        cell: (t) => (
          <Link
            href={`${basePath}/support/${t.id}`}
            className="font-mono text-[0.82rem] font-medium text-foreground underline-offset-4 hover:text-violet-soft hover:underline"
          >
            {t.reference}
          </Link>
        ),
      },
      {
        key: "subject",
        header: "Subject",
        sortable: true,
        sortValue: (t) => t.subject,
        cell: (t) => (
          <Link
            href={`${basePath}/support/${t.id}`}
            className="font-medium text-foreground underline-offset-4 hover:text-violet-soft hover:underline"
          >
            {t.subject}
          </Link>
        ),
      },
      { key: "requester", header: "Requester", sortable: true, sortValue: (t) => t.requester, cell: (t) => <span className="text-muted-foreground">{t.requester}</span> },
      { key: "category", header: "Category", cell: (t) => <span className="text-muted-foreground">{t.category}</span> },
      { key: "priority", header: "Priority", sortable: true, sortValue: (t) => t.priority, cell: (t) => <TicketPriorityBadge priority={t.priority} /> },
      { key: "status", header: "Status", sortable: true, sortValue: (t) => t.status, cell: (t) => <TicketStatusBadge status={t.status} /> },
      {
        key: "updatedAt",
        header: "Updated",
        sortable: true,
        sortValue: (t) => t.updatedAt,
        cell: (t) => <span className="text-muted-foreground">{formatDateTime(t.updatedAt)}</span>,
      },
    ],
    [basePath]
  );

  const mobileCard = useCallback(
    (t: SupportTicket) => (
      <div className="rounded-2xl border border-line bg-elevated/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`${basePath}/support/${t.id}`}
              className="font-medium text-foreground underline-offset-4 hover:text-violet-soft hover:underline"
            >
              {t.subject}
            </Link>
            <p className="mt-0.5 font-mono text-[0.74rem] text-muted-foreground">{t.reference}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <TicketStatusBadge status={t.status} />
            <TicketPriorityBadge priority={t.priority} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] text-muted-foreground">
          <span>{t.requester}</span>
          <span>{t.category}</span>
          <span>Updated {formatDateTime(t.updatedAt)}</span>
        </div>
      </div>
    ),
    [basePath]
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-violet-soft">People</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Support</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ticket queue for the support administrators — every message submitted through the contact form lands here.
        </p>
      </header>

      <PrototypeNotice>
        Live ticket queue backed by the tickets table. Replies and status changes are recorded against the real ticket.
      </PrototypeNotice>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField
          value={search}
          onChange={setSearch}
          label="Search tickets by subject, reference, requester or category"
          placeholder="Search subject, requester, reference…"
          className="w-full lg:w-80"
        />
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-end xl:flex-1">
          <FilterBar options={STATUS_OPTIONS} value={status} onChange={setStatus} ariaLabel="Filter tickets by status" />
          <FilterBar options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} ariaLabel="Filter tickets by priority" />
        </div>
      </div>

      {state === "loading" && <TableSkeleton />}
      {state === "error" && (
        <ErrorState
          title="Tickets unavailable"
          body="The ticket service could not be reached. Try again to reload the queue."
          onRetry={retry}
        />
      )}
      {state === "ready" && filtered.length === 0 && (
        <EmptyState
          icon={LifeBuoy}
          title="No tickets match"
          body="No tickets match the current search, status or priority filters. Clear the filters to see the whole queue."
        />
      )}
      {state === "ready" && filtered.length > 0 && (
        <DataTable
          columns={columns}
          rows={filtered}
          initialSort={{ key: "updatedAt", dir: "desc" }}
          caption="Support ticket queue with priority, status and last update"
          mobileCard={mobileCard}
        />
      )}
    </div>
  );
}
