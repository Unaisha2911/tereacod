"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderItemImage } from "@/components/account/order-item-image";
import { useToast } from "@/hooks/use-toast";
import { cartService, deliveryFeeFor, useCart } from "@/services/cart";
import { useCatalogReady } from "@/lib/client-catalog";
import {
  DEFAULT_DELIVERY_CONFIG,
  fetchCheckoutConfig,
  toDeliveryFeeOverride,
  type CheckoutDeliveryConfig,
} from "@/services/checkout";
import { WhatsAppOrderButton } from "@/components/shared/whatsapp-order-button";
import { composeCartMessage, openWhatsApp } from "@/services/whatsapp";
import { formatAED, cn } from "@/lib/utils";

const scrollAreaClasses =
  "max-h-[32rem] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-glow/30 [&::-webkit-scrollbar-track]:bg-transparent";

export function CartView() {
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const { toast } = useToast();

  // Admin-editable delivery fees — fall back to the built-in constants.
  const [deliveryConfig, setDeliveryConfig] = useState<CheckoutDeliveryConfig>(DEFAULT_DELIVERY_CONFIG);
  useEffect(() => {
    let cancelled = false;
    fetchCheckoutConfig().then((next) => {
      if (!cancelled) setDeliveryConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cart = cartService.getCartDetail(lines);
  const { totals, hasBlocked } = cart;
  const purchasableCount = totals.itemCount;
  const standardFee = deliveryFeeFor(totals.subtotal, "standard", toDeliveryFeeOverride(deliveryConfig));
  const cartTotal = totals.subtotal + standardFee;
  const remainingForFree = Math.max(0, deliveryConfig.freeThreshold - totals.subtotal);

  const onRemove = (key: string, name: string, variantLabel?: string) => {
    cartService.removeLine(key);
    toast({
      title: "Removed from cart",
      description: `${name}${variantLabel ? ` — ${variantLabel}` : ""} was removed from your bag.`,
    });
  };

  // Line DETAILS (names, variants, prices) resolve against the client
  // catalog mirror. With server-side hydration the mirror only loads when
  // the cart actually has lines — gate on its readiness so a returning
  // visitor sees "Restoring your cart…" instead of a momentarily empty
  // shelf, and the grid re-renders the moment the mirror lands.
  const catalogReady = useCatalogReady();
  if (!hydrated || (lines.length > 0 && !catalogReady)) {
    return (
      <PageContainer>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="flex items-center gap-3 text-sm uppercase tracking-[0.24em] text-muted-foreground">
            <span
              aria-hidden="true"
              className="anim-led size-1.5 rounded-full bg-violet-soft text-violet-soft"
              style={{ ["--dur" as string]: "2.2s" }}
            />
            Restoring your cart…
          </p>
        </div>
      </PageContainer>
    );
  }

  if (lines.length === 0) {
    return (
      <PageContainer>
        <PageHeading
          eyebrow="Ordering"
          title="Your cart"
          lead="Your bag for this session — review your products here before checkout."
        />
        <div className="pb-16">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            body="Nothing in the bag yet. Browse the shop and add a product — the cart keeps everything for this session until you check out."
            actionLabel="Discover TereaCOD"
            actionHref="/discover"
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Ordering"
        title="Your cart"
        lead="Your bag for this session — review your products here before checkout."
      />

      <PrototypeNotice className="mb-8">
        Your bag is saved to your account automatically — sign in on any device and it follows you. No real
                      order is placed until checkout is confirmed.
      </PrototypeNotice>

      <div className="grid items-start gap-8 pb-20 lg:grid-cols-[1fr_22rem]">
        {/* Lines */}
        <div className="min-w-0">
          <div className={cn("space-y-3", cart.lines.length > 4 && scrollAreaClasses)} role="list" aria-label="Cart items">
            {cart.lines.map((line) => {
              const variantLabel = line.variantLabel;
              const name = variantLabel ? `${line.product.name} — ${variantLabel}` : line.product.name;
              return (
                <article
                  key={line.key}
                  role="listitem"
                  aria-label={name}
                  className={cn(
                    "rounded-2xl border border-line bg-elevated/50 p-4 transition-colors",
                    line.blocked && "opacity-60"
                  )}
                >
                  <div className="flex gap-4">
                    <Link
                      href={`/products/${line.product.slug}`}
                      className="shrink-0 rounded-xl transition-opacity hover:opacity-90"
                      aria-label={`View ${line.product.name}`}
                    >
                      <OrderItemImage
                        src={line.product.images[0]}
                        alt={line.product.name}
                        className="size-20"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-[0.95rem] font-semibold leading-snug text-foreground">
                            <Link
                              href={`/products/${line.product.slug}`}
                              className="transition-colors hover:text-violet-soft"
                            >
                              {line.product.name}
                            </Link>
                          </h3>
                          {variantLabel && (
                            <span className="mt-1.5 inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide text-muted-foreground">
                              {variantLabel}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(line.key, line.product.name, variantLabel)}
                          aria-label={`Remove ${name} from cart`}
                          className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-error/10 hover:text-error before:absolute before:-inset-2 before:rounded-full before:content-['']"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        {line.blocked ? (
                          <div className="space-y-1.5">
                            <StatusBadge tone="error">{line.blockedReason ?? "Unavailable"}</StatusBadge>
                            <p className="text-[0.72rem] text-muted-foreground">Excluded from totals — remove to continue.</p>
                          </div>
                        ) : (
                          <div
                            role="group"
                            aria-label={`Quantity for ${name}`}
                            className="inline-flex items-center gap-1 rounded-full border border-line p-1"
                          >
                            <button
                              type="button"
                              onClick={() => cartService.setQty(line.key, line.qty - 1)}
                              aria-label={`Decrease quantity of ${name}`}
                              className="relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground before:absolute before:-inset-1 before:rounded-full before:content-['']"
                            >
                              <Minus className="size-4" aria-hidden="true" />
                            </button>
                            <span aria-live="polite" className="min-w-8 text-center text-sm font-medium text-foreground">
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => cartService.setQty(line.key, line.qty + 1)}
                              aria-label={`Increase quantity of ${name}`}
                              className="relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground before:absolute before:-inset-1 before:rounded-full before:content-['']"
                            >
                              <Plus className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}

                        <div className="text-right">
                          <p className="font-display text-sm font-semibold text-foreground">{formatAED(line.lineTotal)}</p>
                          <p className="text-[0.72rem] text-muted-foreground">
                            {formatAED(line.unitPrice)} each
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <aside
          aria-labelledby="cart-summary-heading"
          className="rounded-3xl border border-line bg-elevated/60 p-5 sm:p-6 lg:sticky lg:top-24"
        >
          <h2 id="cart-summary-heading" className="font-display text-lg font-semibold text-foreground">
            Summary
          </h2>

          <dl className="mt-5 space-y-3.5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal ({purchasableCount} {purchasableCount === 1 ? "item" : "items"})</dt>
              <dd className="font-medium text-foreground">{formatAED(totals.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{deliveryConfig.methods.standard.label}</dt>
              <dd className="font-medium text-foreground">
                {standardFee === 0 ? "Free" : formatAED(standardFee)}
              </dd>
            </div>
            <p className="flex items-start gap-2 text-[0.75rem] leading-relaxed text-muted-foreground">
              <Truck className="mt-0.5 size-3.5 shrink-0 text-ice" aria-hidden="true" />
              {remainingForFree > 0
                ? `Add ${formatAED(remainingForFree)} more for free standard delivery at ${formatAED(deliveryConfig.freeThreshold)} or more.`
                : "Standard delivery is free on this order."}
            </p>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-display text-xl font-bold text-foreground">{formatAED(cartTotal)}</dd>
            </div>
          </dl>

          {hasBlocked && (
            <p className="mt-4 rounded-xl border border-warning/30 bg-warning/[0.07] px-3.5 py-2.5 text-[0.78rem] leading-relaxed text-warning">
              Some items are currently unavailable and are not counted in these totals.
            </p>
          )}

          <Link
            href="/checkout"
            aria-disabled={purchasableCount === 0}
            className={cn(
              "neon-glow-btn hover:neon-glow-btn-hover mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-transform hover:-translate-y-0.5",
              purchasableCount === 0 && "pointer-events-none opacity-50"
            )}
          >
            Proceed to checkout
          </Link>
          <WhatsAppOrderButton
            className="mt-3"
            label="Order via WhatsApp"
            disabled={purchasableCount === 0}
            onOpen={() => openWhatsApp(composeCartMessage(cart))}
          />
          <p className="mt-3 text-center text-[0.72rem] leading-relaxed text-muted-foreground">
            18+ age-verified delivery · Cash &amp; card on delivery · UAE-wide
          </p>
        </aside>
      </div>
    </PageContainer>
  );
}
