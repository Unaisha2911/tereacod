"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ScrollText } from "lucide-react";
import { adminService } from "@/services/admin";
import type { AuditEvent, AuditSeverity } from "@/types";
import { DataTable, FilterBar, Pagination, SearchField, type Column } from "@/components/shared/admin-primitives";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";

const SEVERITY_OPTIONS: Array<{ value: AuditSeverity | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  if (severity === "critical") return <StatusBadge tone="error">Critical</StatusBadge>;
  if (severity === "warning") return <StatusBadge tone="warning">Warning</StatusBadge>;
  return <StatusBadge tone="ice">Info</StatusBadge>;
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

/** CSV row — the API adds actorType/actorLabel/targetType/targetId passthrough fields. */
interface AuditCsvRow extends AuditEvent {
  actorType?: string;
  actorLabel?: string;
  targetType?: string;
  targetId?: string;
}

function csvField(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/**
 * Pull up to 500 audit events matching the ACTIVE filters (paged via the audit
 * API at 48 rows per page) and build the CSV export. The loop stops when a
 * page comes back short or the row cap is hit.
 */
async function fetchAuditRowsForExport(search: string, severity: AuditSeverity | "all"): Promise<AuditCsvRow[]> {
  const EXPORT_PAGE_SIZE = 48;
  const MAX_ROWS = 500;
  const rows: AuditCsvRow[] = [];
  const seen = new Set<string>();
  for (let page = 1; rows.length < MAX_ROWS; page += 1) {
    const result = await adminService.auditLog({ search, severity, page, pageSize: EXPORT_PAGE_SIZE });
    if (result.items.length === 0) break;
    for (const event of result.items) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      rows.push(event as AuditCsvRow);
      if (rows.length >= MAX_ROWS) break;
    }
    if (result.items.length < EXPORT_PAGE_SIZE) break; // short page — end of the filtered set
  }
  return rows;
}

function buildAuditCsv(rows: AuditCsvRow[]): string {
  const header = ["id", "at", "actorType", "actorLabel", "action", "severity", "targetType", "targetId", "detail"];
  const lines = [header.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.at,
        row.actorType ?? "",
        row.actorLabel ?? row.actor,
        row.action,
        row.severity,
        row.targetType ?? "",
        row.targetId ?? row.target,
        row.detail,
      ]
        .map(csvField)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

export function AuditLogView() {
  const { toast } = useToast();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [severity, setSeverity] = useState<AuditSeverity | "all">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Query identity for the in-flight request. `loading` is DERIVED from the
  // gap between the requested query and the last rendered one instead of a
  // synchronous setState("loading") in the fetch effect (react-hooks
  // set-state-in-effect — a sync reset there cascades an extra render pass
  // before the async work). Same skeleton-on-every-query-change behaviour.
  const queryKey = `${debouncedSearch}|${severity}|${page}|${attempt}`;
  const [renderedKey, setRenderedKey] = useState(queryKey);
  const loading = state === "loading" || renderedKey !== queryKey;

  // Debounce keystrokes before they hit the server-paged query.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let alive = true;
    adminService
      .auditLog({ search: debouncedSearch, severity, page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (alive) {
          setEvents(result.items);
          setTotal(result.total);
          setState("ready");
          setRenderedKey(queryKey);
        }
      })
      .catch(() => {
        if (alive) {
          setState("error");
          setRenderedKey(queryKey);
        }
      });
    return () => {
      alive = false;
    };
  }, [debouncedSearch, severity, page, attempt, queryKey]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const onSearch = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  const onSeverity = useCallback((next: AuditSeverity | "all") => {
    setSeverity(next);
    setPage(1);
  }, []);

  const openDetail = useCallback((event: AuditEvent) => {
    setSelected(event);
  }, []);

  const columns = useMemo<Column<AuditEvent>[]>(
    () => [
      { key: "at", header: "Time", sortable: true, sortValue: (e) => e.at, cell: (e) => <span className="text-muted-foreground">{formatDateTime(e.at)}</span> },
      { key: "actor", header: "Actor", sortable: true, sortValue: (e) => e.actor, cell: (e) => <span className="text-foreground">{e.actor}</span> },
      {
        key: "action",
        header: "Action",
        sortable: true,
        sortValue: (e) => e.action,
        cell: (e) => <code className="rounded bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[0.76rem] text-foreground">{e.action}</code>,
      },
      { key: "target", header: "Target", cell: (e) => <span className="text-muted-foreground">{e.target}</span> },
      { key: "severity", header: "Severity", sortable: true, sortValue: (e) => e.severity, cell: (e) => <SeverityBadge severity={e.severity} /> },
      { key: "ip", header: "IP", cell: (e) => <span className="font-mono text-[0.76rem] text-muted-foreground">{e.ip ?? "—"}</span> },
      {
        key: "details",
        header: "",
        className: "text-right",
        cell: (e) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDetail(e)}
            aria-label={`View details for event ${e.id}`}
          >
            Details
          </Button>
        ),
      },
    ],
    [openDetail]
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const mobileCard = useCallback(
    (e: AuditEvent) => (
      <button
        type="button"
        onClick={() => openDetail(e)}
        className="w-full rounded-2xl border border-line bg-elevated/40 p-4 text-left transition-colors hover:border-line-strong"
      >
        <div className="flex items-start justify-between gap-3">
          <code className="rounded bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[0.76rem] text-foreground">{e.action}</code>
          <SeverityBadge severity={e.severity} />
        </div>
        <p className="mt-2 text-[0.82rem] text-foreground">{e.target}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.76rem] text-muted-foreground">
          <span>{formatDateTime(e.at)}</span>
          <span>{e.actor}</span>
          {e.ip && <span className="font-mono">{e.ip}</span>}
        </div>
      </button>
    ),
    [openDetail]
  );

  const [exporting, setExporting] = useState(false);

  const onExport = useCallback(async () => {
    setExporting(true);
    try {
      const rows = await fetchAuditRowsForExport(debouncedSearch, severity);
      if (rows.length === 0) {
        toast({ title: "Nothing to export", description: "No audit events matched — the CSV was not generated." });
        return;
      }
      const csv = buildAuditCsv(rows);
      const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tereacod-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Export ready",
        description: `${rows.length} audit event${rows.length === 1 ? "" : "s"} downloaded as CSV.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not build the CSV — try again.",
      });
    } finally {
      setExporting(false);
    }
  }, [toast, debouncedSearch, severity]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-violet-soft">System</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Audit log</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Administrative activity as recorded by the audit service — every admin action on the API is written here.
          </p>
        </div>
        <Button variant="outline" onClick={() => void onExport()} disabled={exporting}>
          <Download className="size-4" aria-hidden="true" />
          {exporting ? "Exporting…" : "Export"}
        </Button>
      </header>

      <PrototypeNotice>
        Live audit entries — each row is a record of a real administrative action on the API.
      </PrototypeNotice>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchField
          value={search}
          onChange={onSearch}
          label="Search audit events by action, actor or target"
          placeholder="Search action, actor or target…"
          className="w-full lg:w-80"
        />
        <FilterBar options={SEVERITY_OPTIONS} value={severity} onChange={onSeverity} ariaLabel="Filter audit events by severity" />
      </div>

      {loading && <TableSkeleton />}
      {state === "error" && (
        <ErrorState
          title="Audit log unavailable"
          body="The audit service could not be reached. Try again to reload the events."
          onRetry={retry}
        />
      )}
      {state === "ready" && events.length === 0 && (
        <EmptyState
          icon={ScrollText}
          title="No audit events match"
          body="No events match the current search or severity filter. Clear the filters to see the full log."
        />
      )}
      {state === "ready" && events.length > 0 && (
        <>
          <DataTable
            columns={columns}
            rows={events}
            initialSort={{ key: "at", dir: "desc" }}
            caption="Audit events with actor, action, target, severity and source IP"
            mobileCard={mobileCard}
          />
          <div className="flex flex-col items-center gap-2">
            <Pagination page={safePage} pageCount={pageCount} onChange={setPage} ariaLabel="Audit log pages" />
            <p className="text-[0.72rem] text-muted-foreground">
              Showing {events.length} of {total} audit {total === 1 ? "event" : "events"}
            </p>
          </div>
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg" aria-describedby="audit-detail-desc">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-3 pr-8">
                  <code className="rounded bg-foreground/[0.06] px-2 py-1 font-mono text-[0.82rem] text-foreground">
                    {selected.action}
                  </code>
                  <SeverityBadge severity={selected.severity} />
                </DialogTitle>
                <DialogDescription id="audit-detail-desc">
                  Full record for audit event {selected.id}.
                </DialogDescription>
              </DialogHeader>
              <dl className="space-y-3 rounded-2xl border border-line bg-foreground/[0.02] p-4 text-sm">
                <div>
                  <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">When</dt>
                  <dd className="mt-0.5 text-foreground">{formatDateTime(selected.at)}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">Actor</dt>
                  <dd className="mt-0.5 text-foreground">{selected.actor}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">Target</dt>
                  <dd className="mt-0.5 text-foreground">{selected.target}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">Detail</dt>
                  <dd className="mt-0.5 leading-relaxed text-foreground">{selected.detail}</dd>
                </div>
                <div className="flex flex-wrap gap-x-10 gap-y-3">
                  <div>
                    <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">Source IP</dt>
                    <dd className="mt-0.5 font-mono text-[0.8rem] text-foreground">{selected.ip ?? "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">Severity</dt>
                    <dd className="mt-0.5">
                      <SeverityBadge severity={selected.severity} />
                    </dd>
                  </div>
                </div>
              </dl>
              <p className="text-[0.75rem] text-muted-foreground">
                Recorded by the audit service — actor, action, target and source IP are captured at write time.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
