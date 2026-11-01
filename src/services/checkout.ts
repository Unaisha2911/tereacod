import type {
  CartDetail,
  DeliveryMethod,
  OrderDetail,
  OrderSummary,
  PaymentMethod,
  TimelineEvent,
} from "@/types";
import { DELIVERY_METHODS, FREE_DELIVERY_THRESHOLD, type DeliveryFeeConfigOverride } from "@/services/cart";
import { placedOrdersService } from "@/services/placed-orders";
import { formatAED } from "@/lib/utils";

/**
 * CHECKOUT SERVICE (API-backed)
 * -----------------------------
 * placeOrder() POSTs to /api/v1/checkout/orders with an idempotency key.
 * The server validates stock, reserves inventory, applies the promo code
 * and computes the authoritative totals; the client then builds the
 * confirmation detail (for the success page) from the returned summary +
 * cart state.
 *
 * fetchCheckoutConfig() (admin-editable delivery fees) and quote() (coupon
 * preview) both degrade gracefully to client-side defaults when the API is
 * unreachable — the storefront stays usable offline.
 */

export interface CheckoutContact {
  fullName: string;
  email: string;
  phone: string;
}

export interface CheckoutAddress {
  emirate: string;
  city: string;
  street: string;
  /** Optional building / villa name — collected by the checkout form. */
  building?: string;
  /** Optional apartment / office number — collected by the checkout form. */
  apartment?: string;
  note?: string;
}

export interface CheckoutPayload {
  contact: CheckoutContact;
  address: CheckoutAddress;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  /** UAE law: nicotine products are 18+ — must be declared at checkout. */
  declaredAge18Plus: boolean;
  /** Optional promo code — validated server-side at order creation. */
  couponCode?: string | null;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  "cash-on-delivery": "Cash on delivery",
  "card-on-delivery": "Card on delivery (machine brought to you)",
  "saved-card": "Saved card (online payments)",
};

/* --------------------------- delivery config ------------------------------ */

export interface CheckoutDeliveryMethodInfo {
  label: string;
  fee: number;
  eta: string;
}

export interface CheckoutDeliveryConfig {
  /** Subtotal at or above which standard delivery is free (AED). */
  freeThreshold: number;
  methods: Record<DeliveryMethod, CheckoutDeliveryMethodInfo>;
}

/** Client defaults — shown until /api/v1/checkout/config responds (or if it fails). */
export const DEFAULT_DELIVERY_CONFIG: CheckoutDeliveryConfig = {
  freeThreshold: FREE_DELIVERY_THRESHOLD,
  methods: {
    standard: { ...DELIVERY_METHODS.standard },
    express: { ...DELIVERY_METHODS.express },
  },
};

function isMethodInfo(value: unknown): value is CheckoutDeliveryMethodInfo {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.label === "string" &&
    typeof candidate.fee === "number" &&
    Number.isFinite(candidate.fee) &&
    typeof candidate.eta === "string"
  );
}

interface CheckoutConfigResponse {
  data?: {
    delivery?: {
      freeThreshold?: number;
      methods?: { standard?: unknown; express?: unknown };
    };
  };
}

let deliveryConfigCache: CheckoutDeliveryConfig | null = null;

/**
 * GET /api/v1/checkout/config — the admin-editable delivery fees and
 * free-shipping threshold. Successful responses are cached for the session;
 * any failure falls back to the built-in constants.
 */
export async function fetchCheckoutConfig(): Promise<CheckoutDeliveryConfig> {
  if (deliveryConfigCache) return deliveryConfigCache;
  try {
    const response = await fetch("/api/v1/checkout/config", {
      headers: { accept: "application/json" },
    });
    if (response.ok) {
      const body = (await response.json()) as CheckoutConfigResponse;
      const delivery = body.data?.delivery;
      const standard = delivery?.methods?.standard;
      const express = delivery?.methods?.express;
      if (
        delivery &&
        typeof delivery.freeThreshold === "number" &&
        Number.isFinite(delivery.freeThreshold) &&
        isMethodInfo(standard) &&
        isMethodInfo(express)
      ) {
        deliveryConfigCache = {
          freeThreshold: delivery.freeThreshold,
          methods: { standard, express },
        };
      }
    }
  } catch {
    // Offline or API unavailable — the built-in defaults stand.
  }
  return deliveryConfigCache ?? DEFAULT_DELIVERY_CONFIG;
}

/**
 * Adapter: the config shape is nested ({ methods.standard.fee }) while
 * deliveryFeeFor() takes a flat override — without this mapping the admin's
 * custom fees silently fall back to the compiled-in constants.
 */
export function toDeliveryFeeOverride(
  config: CheckoutDeliveryConfig | null | undefined
): DeliveryFeeConfigOverride | undefined {
  if (!config) return undefined;
  return {
    freeThreshold: config.freeThreshold,
    standardFee: config.methods.standard.fee,
    expressFee: config.methods.express.fee,
  };
}

/* -------------------------------- quote ----------------------------------- */

export interface CheckoutQuoteCoupon {
  code: string;
  valid: boolean;
  message: string;
}

/**
 * Server preview from POST /api/v1/checkout/quote (all amounts in AED).
 * The coupon is evaluated with the same server-authoritative rules the
 * order itself will apply.
 */
export interface CheckoutQuote {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  itemCount: number;
  hasBlocked: boolean;
  currency: string;
  /** Present when a couponCode was sent — valid:false carries the reason. */
  coupon: CheckoutQuoteCoupon | null;
}

interface QuoteResponse {
  data?: {
    subtotal?: number;
    deliveryFee?: number;
    discount?: number;
    total?: number;
    itemCount?: number;
    hasBlocked?: boolean;
    currency?: string;
    coupon?: CheckoutQuoteCoupon | null;
  };
  error?: { code: string; message: string };
}

function asAED(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function shortStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat("en-AE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Dubai",
    }).format(date);
  } catch {
    return iso.slice(0, 16);
  }
}

function buildTimeline(placedAt: string, express: boolean): TimelineEvent[] {
  const stamp = shortStamp(placedAt);
  return [
    { id: "t1", label: "Order placed", at: stamp, completed: true },
    {
      id: "t2",
      label: "Age & payment verification",
      at: "At the door",
      completed: false,
      note: "Emirates ID checked by the courier on delivery.",
    },
    { id: "t3", label: "Packed", at: "Pending", completed: false },
    { id: "t4", label: "Handed to courier", at: "Pending", completed: false },
    {
      id: "t5",
      label: express ? "Delivered — next day" : "Delivered — ID checked at door",
      at: "Pending",
      completed: false,
    },
  ];
}

interface PlaceOrderResponse {
  data?: OrderSummary;
  error?: { code: string; message: string };
}

/** Build the account-list summary row from a full order detail. */
function summaryFromDetail(detail: OrderDetail): OrderSummary {
  return {
    reference: detail.reference,
    placedAt: detail.placedAt,
    status: detail.status,
    itemCount: detail.items.reduce((sum, item) => sum + item.quantity, 0),
    itemsPreview: detail.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    totalLabel: detail.totalLabel,
    fulfilmentLabel: detail.deliveryLabel,
  };
}

export const checkoutService = {
  /**
   * POST /api/v1/checkout/quote — previews the coupon against the current
   * server-side cart with the chosen delivery method. Throws with a
   * user-safe message on failure.
   */
  async quote(input: {
    deliveryMethod: DeliveryMethod;
    couponCode?: string;
  }): Promise<CheckoutQuote> {
    const response = await fetch("/api/v1/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryMethod: input.deliveryMethod,
        ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as QuoteResponse;
    if (!response.ok || !body.data) {
      throw new Error(body.error?.message ?? "Could not check that promo code right now.");
    }
    const data = body.data;
    return {
      subtotal: asAED(data.subtotal),
      deliveryFee: asAED(data.deliveryFee),
      discount: asAED(data.discount),
      total: asAED(data.total),
      itemCount: asAED(data.itemCount),
      hasBlocked: Boolean(data.hasBlocked),
      currency: typeof data.currency === "string" && data.currency ? data.currency : "AED",
      coupon: data.coupon ?? null,
    };
  },

  /**
   * Places the current cart as an order via the backend. Resolves to the
   * created OrderSummary; throws with a user-safe message on failure.
   */
  async placeOrder(
    payload: CheckoutPayload,
    cart: CartDetail
  ): Promise<OrderSummary> {
    const purchasable = cart.lines.filter((line) => !line.blocked);
    if (purchasable.length === 0) {
      throw new Error("Your bag is empty — add a product from the shop first.");
    }

    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await fetch("/api/v1/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        contact: payload.contact,
        address: {
          emirate: payload.address.emirate,
          city: payload.address.city,
          street: payload.address.street,
          ...(payload.address.building ? { building: payload.address.building } : {}),
          ...(payload.address.apartment ? { apartment: payload.address.apartment } : {}),
          note: payload.address.note,
        },
        deliveryMethod: payload.deliveryMethod,
        paymentMethod: payload.paymentMethod,
        ...(payload.couponCode ? { couponCode: payload.couponCode } : {}),
        declaredAge18Plus: payload.declaredAge18Plus,
        idempotencyKey,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as PlaceOrderResponse;
    if (!response.ok || !body.data) {
      throw new Error(
        body.error?.message ?? "The order could not be placed. Please try again."
      );
    }

    const summary = body.data;
    const placedAt = summary.placedAt;
    const express = payload.deliveryMethod === "express";

    const addressEcho = [payload.address.city, payload.address.emirate].filter(Boolean).join(", ");
    const detail: OrderDetail = {
      reference: summary.reference,
      placedAt,
      status: summary.status,
      timeline: buildTimeline(placedAt, express),
      items: purchasable.map((line) => ({
        name: line.product.name,
        brand: line.product.brand,
        quantity: line.qty,
        variantLabel: line.variantLabel,
        lineTotalLabel: formatAED(line.lineTotal),
        image: line.product.images[0],
      })),
      statusHistory: [
        { status: "placed", at: shortStamp(placedAt) },
        { status: "processing", at: shortStamp(placedAt), note: "Awaiting courier dispatch" },
      ],
      supportHref: "/contact",
      documents: [{ id: `${summary.reference}-receipt`, title: "Delivery receipt", type: "pdf" }],
      deliveryLabel: `Courier to ${addressEcho} — ID verification on delivery`,
      paymentLabel: PAYMENT_LABELS[payload.paymentMethod],
      // The server total is authoritative — it includes any promo discount.
      totalLabel: summary.totalLabel,
    };

    placedOrdersService.add(summary, detail);
    return summary;
  },

  /**
   * GET /api/v1/checkout/orders/:reference — fetches a placed order for
   * signed-in customers (used by the success page when the session cache
   * has no record, e.g. the order was placed in another tab). Resolves to
   * null on 401/404 or any failure so callers keep their fallback UI.
   */
  async fetchPlacedOrder(
    reference: string
  ): Promise<{ summary: OrderSummary; detail: OrderDetail } | null> {
    try {
      const response = await fetch(
        `/api/v1/checkout/orders/${encodeURIComponent(reference)}`,
        { headers: { accept: "application/json" } }
      );
      if (!response.ok) return null; // 401 (guest) / 404 (not the owner) — keep the fallback.
      const body = (await response.json().catch(() => null)) as
        | { data?: OrderDetail }
        | null;
      const detail = body?.data;
      if (!detail || detail.reference !== reference) return null;
      return { summary: summaryFromDetail(detail), detail };
    } catch {
      return null;
    }
  },

  /** Keep the delivery label helper available for display surfaces. */
  fulfilmentLabel(method: DeliveryMethod): string {
    return `${DELIVERY_METHODS[method].label} · ${DELIVERY_METHODS[method].eta}`;
  },
};
