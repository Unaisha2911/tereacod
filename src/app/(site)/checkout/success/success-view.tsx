"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheckBig, Compass, PackageSearch, ReceiptText } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { OrderItemImage } from "@/components/account/order-item-image";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { WhatsAppOrderButton } from "@/components/shared/whatsapp-order-button";
import { composeOrderConfirmationMessage, openWhatsApp } from "@/services/whatsapp";
import { placedOrdersService, usePlacedOrders } from "@/services/placed-orders";
import { checkoutService } from "@/services/checkout";

/** Server-fetch progress for the current mount (one reference per mount). */
type ServerFetch = { ref: string; status: "fetching" | "failed" };

export function SuccessView() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("ref");
  // Keyed by reference so ?ref changes remount the confirmation with fresh
  // fetch state (the lazy initializer below covers the first render).
  return <SuccessConfirmation key={reference ?? "none"} reference={reference} />;
}

function SuccessConfirmation({ reference }: { reference: string | null }) {
  // Subscribe so a simultaneous update (e.g. second tab) re-renders.
  const hydrated = usePlacedOrders((s) => s.hydrated);
  usePlacedOrders((s) => s.summaries);

  const record = reference ? placedOrdersService.byReference(reference) : null;

  // Server fallback: when the session cache has no record for ?ref= (order
  // placed in another tab, or the guest cache was cleared), signed-in
  // customers get the order fetched from GET /api/v1/checkout/orders/:ref.
  // Starts as "fetching" via the lazy initializer — no setState is ever
  // called synchronously inside the effect below.
  const [serverFetch, setServerFetch] = useState<ServerFetch | null>(() =>
    reference ? { ref: reference, status: "fetching" } : null
  );

  useEffect(() => {
    if (!hydrated || !reference || record) return;
    if (serverFetch?.status === "failed") return; // terminal for this mount
    let cancelled = false;
    checkoutService
      .fetchPlacedOrder(reference)
      .then((fetched) => {
        if (fetched && !placedOrdersService.byReference(reference)) {
          // Cache it in the session store so reloads don't refetch.
          placedOrdersService.add(fetched.summary, fetched.detail);
        }
        if (!fetched && !cancelled) setServerFetch({ ref: reference, status: "failed" });
      })
      .catch(() => {
        if (!cancelled) setServerFetch({ ref: reference, status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, reference, record, serverFetch]);

  const fetching = reference !== null && serverFetch?.status === "fetching";

  if (!hydrated || (reference && !record && fetching)) {
    return (
      <PageContainer width="narrow">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="flex items-center gap-3 text-sm uppercase tracking-[0.24em] text-muted-foreground">
            <span
              aria-hidden="true"
              className="anim-led size-1.5 rounded-full bg-violet-soft text-violet-soft"
              style={{ ["--dur" as string]: "2.2s" }}
            />
            Loading confirmation…
          </p>
        </div>
      </PageContainer>
    );
  }

  if (!record) {
    return (
      <PageContainer width="narrow">
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <span className="flex size-16 items-center justify-center rounded-3xl border border-line bg-elevated/60">
            <PackageSearch className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <h1 className="text-h2 font-bold text-foreground">Confirmation not found</h1>
          <p className="max-w-md text-lead text-muted-foreground">
            {reference
              ? `We couldn't load the on-screen confirmation for ${reference} on this device. Your order itself is stored with us — signed-in customers can find it under Order history, and our team can look it up by the reference.`
              : "No order reference was given. Signed-in customers can find their orders under Order history."}
          </p>
          <PrototypeNotice className="text-left">
            Orders are stored server-side with a unique VD- reference and payment is collected on delivery. This
            on-screen confirmation is session-scoped for guests — signing in keeps every order under /account/orders.
          </PrototypeNotice>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/account/orders"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
            >
              <ReceiptText className="size-4" aria-hidden="true" />
              Order history
            </Link>
            <Link
              href="/discover"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50"
            >
              <Compass className="size-4" aria-hidden="true" />
              Continue shopping
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const { summary, detail } = record;

  return (
    <PageContainer width="narrow">
      <div className="flex flex-col items-center gap-4 py-14 text-center sm:py-16">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-3xl border border-violet-glow/40 bg-violet-glow/15 text-violet-soft shadow-[0_0_28px_rgba(139,92,246,0.35)]"
        >
          <CircleCheckBig className="size-8" />
        </span>
        <h1 className="text-h2-neon font-neon font-bold uppercase leading-tight">
          <span className="text-neon">Order placed</span>
        </h1>
        <p className="max-w-md text-lead text-muted-foreground">
          Thank you — your order is in. Keep the reference handy: the courier verifies your Emirates ID at the door.
        </p>
        <p className="rounded-full border border-line bg-foreground/[0.04] px-4 py-1.5 font-mono text-[0.85rem] tracking-wide text-foreground">
          {summary.reference}
        </p>
      </div>

      <section aria-labelledby="success-summary-heading" className="rounded-3xl border border-line bg-elevated/60 p-5 sm:p-6">
        <h2 id="success-summary-heading" className="font-display text-lg font-semibold text-foreground">
          Order summary
        </h2>
        <p className="mt-1 text-[0.78rem] text-muted-foreground">{summary.fulfilmentLabel}</p>

        <ul className="mt-4 divide-y divide-line">
          {detail.items.map((item, index) => (
            <li key={`${item.name}-${item.variantLabel ?? ""}-${index}`} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
              <OrderItemImage
                src={item.image}
                alt={item.variantLabel ? `${item.brand} ${item.name} — ${item.variantLabel}` : `${item.brand} ${item.name}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                  {item.brand}
                  {item.variantLabel ? ` · ${item.variantLabel}` : ""} · Qty {item.quantity}
                </p>
              </div>
              <p className="shrink-0 text-sm text-foreground">{item.lineTotalLabel}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="text-right leading-relaxed text-foreground">{detail.deliveryLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="text-right leading-relaxed text-foreground">{detail.paymentLabel}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-display text-xl font-bold text-foreground">{detail.totalLabel}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-col items-center gap-4 pb-16">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/account/orders"
            className="neon-glow-btn hover:neon-glow-btn-hover inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <ReceiptText className="size-4" aria-hidden="true" />
            Track in order history
          </Link>
          <Link
            href="/discover"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
          >
            <Compass className="size-4" aria-hidden="true" />
            Continue shopping
          </Link>
        </div>
        <div className="w-full max-w-sm">
          <WhatsAppOrderButton
            label="Confirm via WhatsApp"
            onOpen={() => openWhatsApp(composeOrderConfirmationMessage(detail))}
          />
          <p className="mt-2 text-center text-[0.7rem] leading-relaxed text-muted-foreground">
            Send the order reference and summary to our team on WhatsApp for a personal confirmation.
          </p>
        </div>
        <p className="max-w-md text-center text-[0.75rem] leading-relaxed text-muted-foreground">
          Your order is stored against the reference above — save it, it is your confirmation. Payment is collected on
          delivery and your Emirates ID is checked at the door.
        </p>
      </div>
    </PageContainer>
  );
}
