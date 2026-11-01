"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------- SearchField -------------------------- */

export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  label,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-xl border border-line bg-foreground/[0.03] pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-violet-glow/50 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}

/* ----------------------------- FilterBar --------------------------- */

export interface FilterOption<T extends string> {
  value: T | "all";
  label: string;
}

export function FilterBar<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: FilterOption<T>[];
  value: T | "all";
  onChange: (next: T | "all") => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <SlidersHorizontal className="mr-1 size-4 text-muted-foreground" aria-hidden="true" />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-11 rounded-full border px-3.5 text-[0.8rem] font-medium transition-colors",
            value === opt.value
              ? "border-violet-glow/50 bg-violet-glow/15 text-foreground"
              : "border-line text-muted-foreground hover:border-line-strong hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ StatCard --------------------------- */

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "violet" | "ice" | "warning" | "error";
}) {
  const toneRing =
    tone === "violet" ? "border-violet-glow/30 bg-violet-glow/[0.06]" :
    tone === "ice" ? "border-ice/25 bg-ice/[0.05]" :
    tone === "warning" ? "border-warning/30 bg-warning/[0.05]" :
    tone === "error" ? "border-error/30 bg-error/[0.05]" :
    "border-line bg-elevated/40";
  return (
    <div className={cn("rounded-2xl border p-5", toneRing)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-label font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-[1.05rem] text-muted-foreground" aria-hidden="true" />}
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1.5 text-[0.78rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ----------------------------- DataTable --------------------------- */

export interface Column<T> {
  key: string;
  header: string;
  /** Render cell content; defaults to raw value. */
  cell?: (row: T) => React.ReactNode;
  /** Enable sorting on this column. */
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  initialSort,
  emptyMessage = "No records match the current filters.",
  caption,
  mobileCard,
}: {
  columns: Column<T>[];
  rows: T[];
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyMessage?: string;
  caption?: string;
  /** Optional alternative rendering per row on <md screens. */
  mobileCard?: (row: T) => React.ReactNode;
}) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const list = [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return list;
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((s) =>
      s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null
    );
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {mobileCard
          ? sortedRows.map((row) => <div key={row.id}>{mobileCard(row)}</div>)
          : sortedRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-line bg-elevated/40 p-4">
                {columns.slice(0, 4).map((col) => (
                  <div key={col.key} className="flex items-center justify-between gap-3 py-1 text-sm">
                    <span className="text-muted-foreground">{col.header}</span>
                    <span className="text-right text-foreground">{col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.key] ?? "")}</span>
                  </div>
                ))}
              </div>
            ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead>
              <tr className="border-b border-line bg-foreground/[0.02]">
                {columns.map((col) => (
                  <th key={col.key} scope="col" className={cn("px-4 py-3 font-medium text-muted-foreground", col.className)} aria-sort={sort?.key === col.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {col.header}
                        {sort?.key !== col.key ? (
                          <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                        ) : sort.dir === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-foreground/[0.02]">
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3.5 align-middle text-foreground", col.className)}>
                      {col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ----------------------------- Pagination -------------------------- */

export function Pagination({
  page,
  pageCount,
  onChange,
  ariaLabel = "Pagination",
}: {
  page: number;
  pageCount: number;
  onChange: (next: number) => void;
  ariaLabel?: string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1
  );

  return (
    <nav aria-label={ariaLabel} className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="inline-flex size-10 items-center justify-center rounded-xl border border-line text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <button
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "size-10 rounded-xl border text-sm font-medium transition-colors",
              p === page
                ? "border-violet-glow/50 bg-violet-glow/15 text-foreground"
                : "border-line text-muted-foreground hover:text-foreground"
            )}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className="inline-flex size-10 items-center justify-center rounded-xl border border-line text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

/* ---------------------------- FormSection -------------------------- */

export function FormSection({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-elevated/40 p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.02rem] font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-1 text-[0.82rem] text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/* ---------------------------- AuditLogList ------------------------- */

import type { AuditEvent } from "@/types";
import { formatDateTime } from "@/lib/format";

const SEVERITY_TONE = { info: "text-ice", warning: "text-warning", critical: "text-error" } as const;

export function AuditLogList({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="relative space-y-0 pl-6 before:absolute before:inset-y-2 before:left-[7px] before:w-px before:bg-line">
      {events.map((event) => (
        <li key={event.id} className="relative py-3.5">
          <span
            className={cn(
              "absolute -left-6 top-5 size-[9px] rounded-full border-2",
              event.severity === "critical" ? "border-error bg-error/30" : event.severity === "warning" ? "border-warning bg-warning/30" : "border-ice bg-ice/30"
            )}
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={cn("text-[0.7rem] font-semibold uppercase tracking-[0.14em]", SEVERITY_TONE[event.severity])}>{event.severity}</span>
            <code className="min-w-0 break-all rounded bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[0.74rem] text-foreground">{event.action}</code>
            <span className="min-w-0 break-all text-sm text-muted-foreground">{event.target}</span>
          </div>
          <p className="mt-1 text-[0.82rem] leading-relaxed text-muted-foreground">{event.detail}</p>
          <p className="mt-1 break-all font-mono text-[0.7rem] text-muted-foreground/70">
            {formatDateTime(event.at)} · {event.actor}
            {event.ip ? ` · ${event.ip}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
