"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConsolePath } from "@/components/shared/console-path";
import { ArrowLeft, CheckCircle2, CircleDashed, FileText, LifeBuoy, Mail, MapPin, Phone, UserRound, UsersRound } from "lucide-react";
import type { OrderDetail, OrderSummary, OrderStatus } from "@/types";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { FormSection } from "@/components/shared/admin-primitives";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

const STATUS_HISTORY_LABEL: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function ItemImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-line bg-gradient-to-br from-violet-glow/20 to-ice/10 font-display text-xs font-bold text-violet-soft" aria-hidden="true">
        {alt.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="size-14 shrink-0 rounded-xl border border-line object-cover"
    />
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <dt className="text-[0.8rem] text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}


/* --------------------------- status transition ---------------------------- */

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirm order",
  processing: "Start processing",
  packed: "Mark packed",
  shipped: "Hand to courier",
  delivered: "Mark delivered (ID verified)",
  cancelled: "Cancel order",
};

function OrderStatusControl({ reference, currentStatus }: { reference: string; currentStatus: OrderStatus }) {
  const router = useRouter();
  const [next, setNext] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = NEXT_STATUS[currentStatus] ?? [];

  if (options.length === 0) return null;

  const apply = async () => {
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/orders/${encodeURIComponent(reference)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: next, note: note || undefined }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Transition failed");
      setNext("");
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transition failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Next order status"
        value={next}
        onChange={(e) => setNext(e.target.value as OrderStatus)}
        className="min-h-9 rounded-xl border border-line bg-foreground/[0.04] px-3 text-[0.82rem] text-foreground outline-none focus:border-violet-soft/60"
      >
        <option value="">Update status…</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {STATUS_LABEL[option] ?? option}
          </option>
        ))}
      </select>
      {next === "cancelled" && (
        <input
          aria-label="Cancellation note"
          placeholder="Reason (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-9 w-44 rounded-xl border border-line bg-foreground/[0.04] px-3 text-[0.82rem] text-foreground outline-none placeholder:text-muted-foreground focus:border-violet-soft/60"
        />
      )}
      <button
        type="button"
        onClick={apply}
        disabled={!next || busy}
        className="min-h-9 rounded-xl bg-violet-soft px-3.5 text-[0.82rem] font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Applying…" : "Apply"}
      </button>
      {error && <span className="text-[0.78rem] text-warning">{error}</span>}
    </div>
  );
}

/* ------------------------ customer & address ----------------------------- */

function CustomerSection({ detail }: { detail: OrderDetail }) {
  const { customer, shippingAddress } = detail;
  if (!customer && !shippingAddress) return null;

  const addressLines = shippingAddress
    ? [
        shippingAddress.building ? `${shippingAddress.building}${shippingAddress.apartment ? `, ${shippingAddress.apartment}` : ""}` : shippingAddress.apartment,
        shippingAddress.street,
        `${shippingAddress.city}, ${shippingAddress.emirate}`,
      ].filter(Boolean)
    : [];

  return (
    <FormSection
      title="Customer & delivery address"
      description="Identity and shipping details captured at checkout."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {customer && (
          <div className="rounded-2xl border border-line bg-foreground/[0.02] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-gradient-to-br from-violet-glow/25 to-ice/15 text-[0.72rem] font-bold text-foreground"
                  aria-hidden="true"
                >
                  {customer.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .join("") || <UserRound className="size-4 text-muted-foreground" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.8rem] text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                    {customer.email}
                  </p>
                </div>
              </div>
              {customer.isGuest && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <UsersRound className="size-3" aria-hidden="true" />
                  Guest
                </span>
              )}
            </div>
            <p className="mt-3 border-t border-line pt-2.5 text-[0.75rem] text-muted-foreground">
              {customer.isGuest
                ? "Guest checkout — no customer account is linked to this order."
                : "Registered customer — the order is attributed to their account."}
            </p>
          </div>
        )}

        {shippingAddress && (
          <div className="rounded-2xl border border-line bg-foreground/[0.02] p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Shipping address
            </p>
            <div className="mt-2.5 space-y-1.5 text-sm text-foreground">
              <p className="font-medium">{shippingAddress.fullName}</p>
              {addressLines.map((line) => (
                <p key={line} className="flex items-start gap-2 text-[0.86rem] text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {line}
                </p>
              ))}
              <p className="flex items-center gap-2 text-[0.86rem] text-muted-foreground">
                <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                {shippingAddress.phone}
              </p>
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
}

export function OrderDetailView({ summary, detail }: { summary: OrderSummary; detail: OrderDetail | null }) {
  const basePath = useConsolePath();
  return (
    <div className="space-y-6">
      <Link
        href={basePath + "/orders"}
        className="inline-flex items-center gap-2 text-[0.82rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to orders
      </Link>

      <PrototypeNotice>
        Live order record — status transitions below are applied through the audited fulfilment state machine.
      </PrototypeNotice>

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-violet-soft">Order</p>
          <h1 className="mt-1 font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">{summary.reference}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed {formatDateTime(summary.placedAt)}</p>
        </div>
        <OrderStatusBadge status={summary.status} />
          <OrderStatusControl reference={summary.reference} currentStatus={summary.status} />
      </header>

      {detail ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Timeline */}
            <FormSection title="Fulfilment timeline" description="Completed and pending milestones for this order.">
              <ol className="relative space-y-0 pl-7" aria-label="Order timeline">
                <span className="absolute inset-y-2 left-[9px] w-px bg-line" aria-hidden="true" />
                {detail.timeline.map((step) => (
                  <li key={step.id} className="relative py-3">
                    <span
                      className="absolute -left-7 top-4 flex size-[19px] items-center justify-center rounded-full border-2 bg-abyss"
                      style={{ borderColor: step.completed ? "var(--violet)" : "var(--line-strong)" }}
                      aria-hidden="true"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="size-3 text-violet-soft" />
                      ) : (
                        <CircleDashed className="size-3 text-muted-foreground" />
                      )}
                    </span>
                    <p className={cn("text-sm font-medium", step.completed ? "text-foreground" : "text-muted-foreground")}>
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[0.78rem] text-muted-foreground">
                      {step.at}
                      {step.completed ? " · completed" : " · pending"}
                    </p>
                  </li>
                ))}
              </ol>
            </FormSection>

            {/* Delivery / payment / total */}
            <FormSection title="Summary" description="Delivery, payment and total for this order.">
              <dl>
                <SummaryRow label="Delivery" value={detail.deliveryLabel} />
                <SummaryRow label="Payment" value={detail.paymentLabel} />
                <SummaryRow label="Total" value={<span className="font-display text-base font-semibold">{detail.totalLabel}</span>} />
              </dl>
              {detail.documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Documents</p>
                  {detail.documents.map((d) => (
                    <p key={d.id} className="flex items-center gap-2 text-[0.82rem] text-muted-foreground">
                      <FileText className="size-3.5" aria-hidden="true" />
                      {d.title}
                      <span className="rounded-full border border-line px-1.5 py-0.5 font-mono text-[0.62rem] uppercase">
                        {d.type}
                      </span>
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
                <Link
                  href={basePath + "/support"}
                  className="inline-flex items-center gap-2 text-[0.84rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <LifeBuoy className="size-3.5" aria-hidden="true" />
                  Open support inbox
                </Link>
              </div>
            </FormSection>
          </div>

          {/* Customer identity + shipping address */}
          <CustomerSection detail={detail} />

          {/* Items */}
          <FormSection title={`Items (${detail.items.length})`} description="Line items as recorded on the order.">
            <ul className="divide-y divide-line rounded-2xl border border-line bg-foreground/[0.02]">
              {detail.items.map((item) => (
                <li key={`${item.name}-${item.variantLabel ?? ""}`} className="flex items-center gap-4 p-4">
                  <ItemImage src={item.image} alt={item.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-[0.78rem] text-muted-foreground">
                      {item.brand}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">×{item.quantity}</p>
                    <p className="mt-0.5 text-[0.82rem] text-muted-foreground">{item.lineTotalLabel}</p>
                  </div>
                </li>
              ))}
            </ul>
          </FormSection>

          {/* Status history */}
          <FormSection title="Status history" description="Chronological status transitions recorded in the audit trail.">
            <div className="overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Order status history</caption>
                <thead>
                  <tr className="border-b border-line bg-foreground/[0.02]">
                    <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">When</th>
                    <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.statusHistory.map((h, i) => (
                    <tr key={`${h.status}-${i}`} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3 text-foreground">{STATUS_HISTORY_LABEL[h.status] ?? h.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.at}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>
        </>
      ) : (
        <FormSection
          title="Full record not available"
          description="The full record could not be loaded for this reference — showing the summary row from the orders table."
        >
          <dl>
            <SummaryRow label="Reference" value={<span className="font-mono text-[0.85rem]">{summary.reference}</span>} />
            <SummaryRow label="Placed" value={formatDateTime(summary.placedAt)} />
            <SummaryRow label="Status" value={<OrderStatusBadge status={summary.status} />} />
            <SummaryRow label="Items" value={`${summary.itemCount} — ${summary.itemsPreview.map((i) => `${i.quantity}× ${i.name}`).join(", ")}`} />
            <SummaryRow label="Fulfilment" value={summary.fulfilmentLabel} />
            <SummaryRow label="Total" value={<span className="font-display text-base font-semibold">{summary.totalLabel}</span>} />
          </dl>
          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
            <Link
              href={basePath + "/support"}
              className="inline-flex items-center gap-2 text-[0.84rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <LifeBuoy className="size-3.5" aria-hidden="true" />
              Open support inbox
            </Link>
          </div>
        </FormSection>
      )}
    </div>
  );
}
