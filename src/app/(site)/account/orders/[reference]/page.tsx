import type { Metadata } from "next";
import Link from "next/link";
import { FileWarning, LifeBuoy } from "lucide-react";
import { AccountPage } from "@/components/account/account-page";
import { OrderItemImage } from "@/components/account/order-item-image";
import { formatDate } from "@/lib/format";
import { DocumentCard } from "@/components/shared/content-card";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { getOrderDetailRow, mapOrderDetail } from "@/server/repos/orders";
import { getCurrentIdentity } from "@/server/auth-context";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import type { OrderDetail } from "@/types";

/**
 * No order records are prerendered: order details live in the database
 * (session-placed and seeded demo orders) and render on demand.
 */
export async function generateStaticParams(): Promise<Array<{ reference: string }>> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `Order ${reference}`,
    description: "Order record — status, timeline and delivery details.",
    // Private account surface: keep it out of every index even though
    // robots.txt already disallows /account (defence in depth).
    robots: { index: false, follow: false },
  };
}

const cardShell = "rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6";

function StatusTimeline({ detail }: { detail: OrderDetail }) {
  return (
    <section className={cardShell} aria-labelledby="order-timeline-heading">
      <h2 id="order-timeline-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
        Status timeline
      </h2>
      <ol className="relative mt-5 space-y-6 pl-7 before:absolute before:inset-y-2 before:left-[8px] before:w-px before:bg-line">
        {detail.timeline.map((event) => (
          <li key={event.id} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-7 top-1 size-[11px] rounded-full border-2",
                event.completed ? "border-violet-glow bg-violet-glow/50" : "border-line-strong bg-transparent"
              )}
            />
            <p className={cn("text-sm font-medium", event.completed ? "text-foreground" : "text-muted-foreground")}>
              {event.label}
              {!event.completed && <span className="ml-2 text-[0.72rem] uppercase tracking-[0.12em]">Pending</span>}
            </p>
            <p className="mt-0.5 text-[0.78rem] text-muted-foreground">{event.at}</p>
            {event.note && <p className="mt-1 text-[0.78rem] leading-relaxed text-muted-foreground">{event.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function OrderItems({ detail }: { detail: OrderDetail }) {
  return (
    <section className={cardShell} aria-labelledby="order-items-heading">
      <h2 id="order-items-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
        Items
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {detail.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center gap-4 py-4 first:pt-1 last:pb-0">
            <OrderItemImage src={item.image} alt={item.variantLabel ? `${item.brand} ${item.name} — ${item.variantLabel}` : `${item.brand} ${item.name}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              <p className="mt-0.5 text-[0.78rem] text-muted-foreground">
                {item.brand}
                {item.variantLabel ? ` · ${item.variantLabel}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm text-foreground">Qty {item.quantity}</p>
              <p className="mt-0.5 text-[0.78rem] text-muted-foreground">{item.lineTotalLabel}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusHistory({ detail }: { detail: OrderDetail }) {
  return (
    <section className={cardShell} aria-labelledby="order-history-heading">
      <h2 id="order-history-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
        Status history
      </h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Status history for order {detail.reference}</caption>
          <thead>
            <tr className="border-b border-line text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
              <th scope="col" className="py-2.5 pr-4 font-medium">
                Status
              </th>
              <th scope="col" className="py-2.5 pr-4 font-medium">
                When
              </th>
              <th scope="col" className="py-2.5 font-medium">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {detail.statusHistory.map((entry, index) => (
              <tr key={`${entry.status}-${index}`} className="border-b border-line/60 last:border-0">
                <td className="py-3 pr-4">
                  <OrderStatusBadge status={entry.status} />
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{entry.at}</td>
                <td className="py-3 text-muted-foreground">{entry.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderSummaryCard({ detail }: { detail: OrderDetail }) {
  return (
    <section className={cardShell} aria-labelledby="order-summary-heading">
      <h2 id="order-summary-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
        Summary
      </h2>
      <dl className="mt-4 space-y-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Delivery</dt>
          <dd className="mt-0.5 leading-relaxed text-foreground">{detail.deliveryLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="mt-0.5 leading-relaxed text-foreground">{detail.paymentLabel}</dd>
        </div>
        <div className="border-t border-line pt-4">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="mt-0.5 font-display text-xl font-bold text-foreground">{detail.totalLabel}</dd>
        </div>
      </dl>
    </section>
  );
}

function OrderDetailBody({ detail }: { detail: OrderDetail }) {
  return (
    <div className="space-y-5">
      <p className="text-[0.78rem] text-muted-foreground">
        Order record — stored against your account with a unique VD- reference. Payment is collected on delivery.
      </p>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-meta font-medium uppercase tracking-[0.18em] text-muted-foreground">Reference</p>
          <p className="mt-1 break-all font-display text-2xl font-bold tracking-tight text-foreground">
            {detail.reference}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Placed {formatDate(detail.placedAt)}</p>
        </div>
        <OrderStatusBadge status={detail.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <StatusTimeline detail={detail} />
          <OrderItems detail={detail} />
          <StatusHistory detail={detail} />
        </div>

        <div className="min-w-0 space-y-5">
          <OrderSummaryCard detail={detail} />

          {detail.documents.length > 0 && (
            <section className={cardShell} aria-labelledby="order-documents-heading">
              <h2 id="order-documents-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
                Documents
              </h2>
              <div className="mt-3 space-y-2">
                {detail.documents.map((doc) => (
                  <DocumentCard key={doc.id} title={doc.title} type={doc.type} href={doc.href} note={doc.note} />
                ))}
              </div>
            </section>
          )}

          <section className={cardShell} aria-labelledby="order-support-heading">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-foreground/[0.04] text-violet-soft">
                <LifeBuoy className="size-5" aria-hidden="true" />
              </span>
              <h2 id="order-support-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
                Need help with this order?
              </h2>
            </div>
            <Link
              href={detail.supportHref}
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
            >
              Contact support
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  // Server gate: the viewer must own the order. Unknown references and
  // other people's orders render the same "record unavailable" state, so
  // order references cannot be enumerated.
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/account/sign-in?next=" + encodeURIComponent(`/account/orders/${reference}`));
  let detail: OrderDetail | null = null;
  try {
    const row = await getOrderDetailRow(reference);
    detail = row && row.order.user_id === identity.user.id ? mapOrderDetail(row) : null;
  } catch {
    detail = null;
  }

  return (
    <AccountPage
      title={`Order ${reference}`}
      eyebrow="Member area"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account" },
        { label: "Orders", href: "/account/orders" },
        { label: reference },
      ]}
    >
      {detail ? (
        <OrderDetailBody detail={detail} />
      ) : (
        <div className="space-y-5">
          <EmptyState
            icon={FileWarning}
            title="Order record unavailable"
            body="No order record with this reference belongs to your account — check the reference or head back to your order history."
            actionLabel="Back to order history"
            actionHref="/account/orders"
          />
          {/* Session-placed orders keep their confirmation at the checkout
              success screen instead of a detail route. */}
          <p className="text-center text-[0.82rem] text-muted-foreground">
            Just placed this order?{" "}
            <Link
              href={`/checkout/success?ref=${encodeURIComponent(reference)}`}
              className="font-medium text-violet-soft underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Open its confirmation
            </Link>
          </p>
        </div>
      )}
    </AccountPage>
  );
}
