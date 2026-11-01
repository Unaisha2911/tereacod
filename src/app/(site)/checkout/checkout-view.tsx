"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { BadgePercent, Loader2, ShoppingBag, Tag, TriangleAlert, X } from "lucide-react";
import { WhatsAppOrderButton } from "@/components/shared/whatsapp-order-button";
import { composeCheckoutMessage, getWhatsAppDisplay, openWhatsApp } from "@/services/whatsapp";
import { PageHeading } from "@/components/layout/page-heading";
import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { OrderItemImage } from "@/components/account/order-item-image";
import {
  Checkbox,
  FormError,
  FormField,
  RadioGroup,
  Select,
  TextArea,
  TextInput,
} from "@/components/forms/fields";
import { cartService, deliveryFeeFor, useCart } from "@/services/cart";
import { useCatalogReady } from "@/lib/client-catalog";
import {
  DEFAULT_DELIVERY_CONFIG,
  checkoutService,
  fetchCheckoutConfig,
  toDeliveryFeeOverride,
  type CheckoutDeliveryConfig,
} from "@/services/checkout";
import { formatAED, cn } from "@/lib/utils";

const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const;

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9][0-9\s\-()]{6,18}$/, "Enter a valid contact number, e.g. +971 50 123 4567."),
  emirate: z.string().min(1, "Choose an emirate."),
  city: z.string().trim().min(2, "Enter your city or area."),
  street: z.string().trim().min(5, "Enter your street address."),
  building: z.string().trim().max(80, "Keep the building under 80 characters.").optional(),
  apartment: z.string().trim().max(80, "Keep the apartment under 80 characters.").optional(),
  note: z.string().trim().max(200, "Keep the note under 200 characters.").optional(),
  deliveryMethod: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["cash-on-delivery", "card-on-delivery"]),
  ageConfirmed: z
    .boolean()
    .refine((value) => value === true, {
      message: "You must confirm you are 18 or older — nicotine products are sold to adults only.",
    }),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

const PAYMENT_OPTIONS = [
  { value: "cash-on-delivery", label: "Cash on delivery", description: "Pay the courier in cash — ID checked at the door." },
  { value: "card-on-delivery", label: "Card on delivery", description: "Pay by card on the courier's machine." },
] as const;

/** Applied coupon state — the discount is the server-quoted amount (AED). */
interface AppliedCoupon {
  code: string;
  message: string;
  discount: number;
}

type CouponStatus = "idle" | "applying" | "error";

export function CheckoutView() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Admin-editable delivery fees — fall back to the built-in constants.
  const [config, setConfig] = useState<CheckoutDeliveryConfig>(DEFAULT_DELIVERY_CONFIG);
  useEffect(() => {
    let cancelled = false;
    fetchCheckoutConfig().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Coupon preview state.
  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState<CouponStatus>("idle");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const lastQuoteKeyRef = useRef<string | null>(null);

  const cart = cartService.getCartDetail(lines);
  const { totals, hasBlocked } = cart;
  const purchasableCount = totals.itemCount;
  const blockedLines = cart.lines.filter((line) => line.blocked);

  // Details resolve against the client catalog mirror — hold the
  // "Preparing checkout…" state until it lands (returning visitors with
  // a cart), mirroring the cart view's readiness gate.
  const catalogReady = useCatalogReady();

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      emirate: "",
      city: "",
      street: "",
      building: "",
      apartment: "",
      note: "",
      deliveryMethod: "standard",
      paymentMethod: "cash-on-delivery",
      ageConfirmed: false,
    },
  });

  const deliveryMethod = useWatch({ control: form.control, name: "deliveryMethod", defaultValue: "standard" });
  const deliveryFee = deliveryFeeFor(totals.subtotal, deliveryMethod, toDeliveryFeeOverride(config));
  const discount = appliedCoupon?.discount ?? 0;
  // Mirrors the server formula: max(0, subtotal − discount + delivery fee).
  const total = Math.max(0, totals.subtotal - discount + deliveryFee);
  /** Total without the promo — WhatsApp orders can't redeem codes. */
  const totalWithoutCoupon = totals.subtotal + deliveryFee;
  const submitting = form.formState.isSubmitting;

  const DELIVERY_OPTIONS = [
    {
      value: "standard",
      label: config.methods.standard.label,
      description:
        totals.subtotal >= config.freeThreshold
          ? `${config.methods.standard.eta} · Free — order is ${formatAED(config.freeThreshold)} or more`
          : `${config.methods.standard.eta} · Free at ${formatAED(config.freeThreshold)} or more, otherwise ${formatAED(config.methods.standard.fee)}`,
    },
    {
      value: "express",
      label: config.methods.express.label,
      description: `${config.methods.express.eta} · ${formatAED(config.methods.express.fee)}`,
    },
  ];

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || couponStatus === "applying") return;
    setCouponStatus("applying");
    setCouponMessage(null);
    try {
      const quote = await checkoutService.quote({ deliveryMethod, couponCode: code });
      if (quote.coupon && quote.coupon.valid) {
        setAppliedCoupon({
          code: quote.coupon.code,
          message: quote.coupon.message,
          discount: quote.discount,
        });
        lastQuoteKeyRef.current = `${deliveryMethod}:${quote.coupon.code}:${totals.subtotal}`;
        setCouponInput("");
        setCouponStatus("idle");
        setCouponMessage(quote.coupon.message);
      } else {
        setAppliedCoupon(null);
        setCouponStatus("error");
        setCouponMessage(quote.coupon?.message ?? "This promo code is not valid.");
      }
    } catch (error) {
      setAppliedCoupon(null);
      setCouponStatus("error");
      setCouponMessage(
        error instanceof Error ? error.message : "Could not check that promo code right now."
      );
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMessage(null);
    setCouponStatus("idle");
    lastQuoteKeyRef.current = null;
  };

  const appliedCode = appliedCoupon?.code ?? null;
  // Keep the quoted discount honest when the cart or delivery method changes
  // while a coupon is applied (free-delivery coupons track the delivery fee).
  useEffect(() => {
    if (!appliedCode) return;
    const key = `${deliveryMethod}:${appliedCode}:${totals.subtotal}`;
    if (lastQuoteKeyRef.current === key) return;
    let cancelled = false;
    checkoutService
      .quote({ deliveryMethod, couponCode: appliedCode })
      .then((quote) => {
        if (cancelled) return;
        lastQuoteKeyRef.current = key;
        if (quote.coupon && quote.coupon.valid) {
          setAppliedCoupon({
            code: quote.coupon.code,
            message: quote.coupon.message,
            discount: quote.discount,
          });
          setCouponStatus("idle");
          setCouponMessage(quote.coupon.message);
        } else {
          setAppliedCoupon(null);
          setCouponStatus("error");
          setCouponMessage(quote.coupon?.message ?? "This promo code is not valid for this order.");
        }
      })
      .catch(() => {
        // Transient network issue — keep the applied coupon as-is.
      });
    return () => {
      cancelled = true;
    };
  }, [appliedCode, deliveryMethod, totals.subtotal]);

  const onSubmit = form.handleSubmit(async (values) => {
    // The server rejects the WHOLE order when any raw cart line is blocked —
    // the button is disabled, this guard keeps submit-in-flight attempts out.
    if (hasBlocked || purchasableCount === 0) return;
    setSubmitError(null);
    try {
      const summary = await checkoutService.placeOrder(
        {
          contact: { fullName: values.fullName, email: values.email, phone: values.phone },
          address: {
            emirate: values.emirate,
            city: values.city,
            street: values.street,
            building: values.building?.trim() || undefined,
            apartment: values.apartment?.trim() || undefined,
            note: values.note || undefined,
          },
          deliveryMethod: values.deliveryMethod,
          paymentMethod: values.paymentMethod,
          declaredAge18Plus: values.ageConfirmed,
          couponCode: appliedCoupon?.code ?? null,
        },
        cart
      );
      cartService.clear();
      router.push(`/checkout/success?ref=${encodeURIComponent(summary.reference)}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "The order could not be placed. Please try again."
      );
    }
  });

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
            Preparing checkout…
          </p>
        </div>
      </PageContainer>
    );
  }

  if (lines.length === 0) {
    return (
      <PageContainer>
        <PageHeading
          eyebrow="Checkout"
          title="Checkout"
          lead="Confirm your details and place the order — delivery across the UAE."
        />
        <div className="pb-16">
          <EmptyState
            icon={ShoppingBag}
            title="Nothing to check out"
            body="Your cart is empty. Add a product at TereaCOD and come back — your details will be waiting."
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
        eyebrow="Checkout"
        title="Checkout"
        lead="Confirm your details and place the order — delivery across the UAE."
      />

      <PrototypeNotice className="mb-8">
        This is a real checkout: placing the order reserves your items, issues your VD- order reference and alerts our
        team. Pay by cash or card on delivery — nothing is charged online today. Your order reference is your
        confirmation, so save it. 18+ only.
      </PrototypeNotice>

      <form onSubmit={onSubmit} noValidate className="pb-20">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
          {/* Form column */}
          <div className="min-w-0 space-y-10">
            {hasBlocked && (
              <div
                role="alert"
                className="space-y-3 rounded-2xl border border-warning/30 bg-warning/[0.07] p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                  <div className="min-w-0 text-[0.84rem] leading-relaxed text-warning">
                    <p className="font-semibold">Some items in your bag can&apos;t be ordered</p>
                    <p>
                      {blockedLines.length} unavailable {blockedLines.length === 1 ? "item is" : "items are"} in
                      your cart — orders that include them are rejected, so placing the order is disabled until
                      they are removed.
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5 pl-7" aria-label="Unavailable items">
                  {blockedLines.map((line) => (
                    <li key={line.key} className="text-[0.8rem] leading-relaxed">
                      <span className="font-medium text-warning">
                        {line.product.name}
                        {line.variantLabel ? ` — ${line.variantLabel}` : ""}
                      </span>
                      <span className="text-warning/75"> · {line.blockedReason ?? "Unavailable"}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/cart"
                  className="inline-flex min-h-11 items-center rounded-full border border-warning/40 px-5 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-warning transition-colors hover:bg-warning/10"
                >
                  Review your cart to remove them
                </Link>
              </div>
            )}

            {/* Contact */}
            <section aria-labelledby="checkout-contact-heading" className="space-y-4">
              <h2 id="checkout-contact-heading" className="font-display text-lg font-semibold text-foreground">
                Contact
              </h2>
              <FormField label="Full name" htmlFor="checkout-name" required error={form.formState.errors.fullName?.message}>
                <TextInput
                  id="checkout-name"
                  autoComplete="name"
                  placeholder="Your full name"
                  invalid={Boolean(form.formState.errors.fullName)}
                  {...form.register("fullName")}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Email" htmlFor="checkout-email" required error={form.formState.errors.email?.message}>
                  <TextInput
                    id="checkout-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    invalid={Boolean(form.formState.errors.email)}
                    {...form.register("email")}
                  />
                </FormField>
                <FormField
                  label="Phone"
                  htmlFor="checkout-phone"
                  required
                  hint="The courier calls before arrival."
                  error={form.formState.errors.phone?.message}
                >
                  <TextInput
                    id="checkout-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+971 50 123 4567"
                    invalid={Boolean(form.formState.errors.phone)}
                    {...form.register("phone")}
                  />
                </FormField>
              </div>
            </section>

            {/* Delivery address */}
            <section aria-labelledby="checkout-address-heading" className="space-y-4">
              <h2 id="checkout-address-heading" className="font-display text-lg font-semibold text-foreground">
                Delivery address
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Emirate" htmlFor="checkout-emirate" required error={form.formState.errors.emirate?.message}>
                  <Select
                    id="checkout-emirate"
                    invalid={Boolean(form.formState.errors.emirate)}
                    aria-describedby={form.formState.errors.emirate ? "checkout-emirate-error" : undefined}
                    {...form.register("emirate")}
                  >
                    <option value="">Select an emirate</option>
                    {EMIRATES.map((emirate) => (
                      <option key={emirate} value={emirate}>
                        {emirate}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="City or area" htmlFor="checkout-city" required error={form.formState.errors.city?.message}>
                  <TextInput
                    id="checkout-city"
                    autoComplete="address-level2"
                    placeholder="e.g. Dubai Marina"
                    invalid={Boolean(form.formState.errors.city)}
                    {...form.register("city")}
                  />
                </FormField>
              </div>
              <FormField
                label="Street address"
                htmlFor="checkout-street"
                required
                hint="Street or area name — building and apartment details go below."
                error={form.formState.errors.street?.message}
              >
                <TextInput
                  id="checkout-street"
                  autoComplete="street-address"
                  placeholder="Street / area"
                  invalid={Boolean(form.formState.errors.street)}
                  {...form.register("street")}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Building (optional)" htmlFor="checkout-building">
                  <TextInput
                    id="checkout-building"
                    autoComplete="address-line2"
                    placeholder="e.g. Marina Plaza Tower"
                    invalid={Boolean(form.formState.errors.building)}
                    {...form.register("building")}
                  />
                </FormField>
                <FormField label="Apartment (optional)" htmlFor="checkout-apartment">
                  <TextInput
                    id="checkout-apartment"
                    autoComplete="address-line3"
                    placeholder="e.g. Apt 1204"
                    invalid={Boolean(form.formState.errors.apartment)}
                    {...form.register("apartment")}
                  />
                </FormField>
              </div>
              <FormField
                label="Delivery note (optional)"
                htmlFor="checkout-note"
                error={form.formState.errors.note?.message}
              >
                <TextArea
                  id="checkout-note"
                  rows={2}
                  maxLength={200}
                  placeholder="Gate code, best time to deliver, landmark…"
                  invalid={Boolean(form.formState.errors.note)}
                  {...form.register("note")}
                />
              </FormField>
            </section>

            {/* Delivery method */}
            <section aria-labelledby="checkout-delivery-heading" className="space-y-4">
              <h2 id="checkout-delivery-heading" className="font-display text-lg font-semibold text-foreground">
                Delivery method
              </h2>
              <Controller
                control={form.control}
                name="deliveryMethod"
                render={({ field }) => (
                  <RadioGroup
                    name="deliveryMethod"
                    label="Speed"
                    value={field.value}
                    onChange={field.onChange}
                    options={[...DELIVERY_OPTIONS]}
                  />
                )}
              />
            </section>

            {/* Payment method */}
            <section aria-labelledby="checkout-payment-heading" className="space-y-4">
              <h2 id="checkout-payment-heading" className="font-display text-lg font-semibold text-foreground">
                Payment method
              </h2>
              <Controller
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <RadioGroup name="paymentMethod" label="How you'll pay" value={field.value} onChange={field.onChange} options={[...PAYMENT_OPTIONS]} />
                )}
              />
              <p className="text-[0.75rem] leading-relaxed text-muted-foreground">
                Payment is collected on delivery — cash, or card on the courier's machine. No online card charge
                happens today.
              </p>
            </section>

            {/* 18+ age confirmation */}
            <section aria-labelledby="checkout-age-heading" className="space-y-3">
              <h2 id="checkout-age-heading" className="font-display text-lg font-semibold text-foreground">
                Age confirmation
              </h2>
              <div className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-4 sm:p-5">
                <Controller
                  control={form.control}
                  name="ageConfirmed"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Checkbox
                        checked={field.value}
                        onChange={field.onChange}
                        label="I confirm I am 18 years of age or older"
                      />
                      <p className="text-[0.78rem] leading-relaxed text-warning/90">
                        Nicotine is an addictive chemical. By law, nicotine products can only be sold to adults aged 18
                        or over in the UAE — the courier verifies a valid Emirates ID at the door.
                      </p>
                      {form.formState.errors.ageConfirmed?.message && (
                        <p role="alert" className="text-[0.78rem] font-medium text-error">
                          {form.formState.errors.ageConfirmed.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>
            </section>
          </div>

          {/* Review + totals */}
          <aside
            aria-labelledby="checkout-review-heading"
            className="min-w-0 rounded-3xl border border-line bg-elevated/60 p-5 sm:p-6 lg:sticky lg:top-24"
          >
            <h2 id="checkout-review-heading" className="font-display text-lg font-semibold text-foreground">
              Order review
            </h2>

            <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-glow/30 [&::-webkit-scrollbar-track]:bg-transparent">
              {cart.lines.map((line) => (
                <li key={line.key} className={cn("flex items-center gap-3", line.blocked && "opacity-60")}>
                  <OrderItemImage src={line.product.images[0]} alt={line.product.name} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.85rem] font-medium text-foreground">{line.product.name}</p>
                    <p className="truncate text-[0.72rem] text-muted-foreground">
                      {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.qty}
                    </p>
                  </div>
                  <p className="shrink-0 text-[0.82rem] text-foreground">
                    {line.blocked ? "—" : formatAED(line.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>

            {/* Promo code */}
            <section aria-labelledby="checkout-coupon-heading" className="mt-5 border-t border-line pt-4">
              <h3
                id="checkout-coupon-heading"
                className="flex items-center gap-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                <Tag className="size-3.5 text-violet-soft" aria-hidden="true" />
                Promo code
              </h3>
              {appliedCoupon ? (
                <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-violet-glow/40 bg-violet-glow/[0.08] px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <BadgePercent className="size-4 shrink-0 text-violet-soft" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[0.82rem] font-semibold tracking-wide text-foreground">
                        {appliedCoupon.code}
                      </p>
                      <p className="truncate text-[0.72rem] text-violet-soft">
                        {/* Free-delivery coupons quote a discount equal to the delivery
                            fee — show the server's own message instead of the misleading
                            "−AED 25 off this order". */}
                        {appliedCoupon.discount === deliveryFee && appliedCoupon.message
                          ? appliedCoupon.message
                          : `−${formatAED(appliedCoupon.discount)} off this order`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    aria-label={`Remove promo code ${appliedCoupon.code}`}
                    className="relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-error before:absolute before:-inset-1.5 before:rounded-full before:content-['']"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-2.5 flex items-center gap-2">
                  <label htmlFor="checkout-coupon" className="sr-only">
                    Promo code
                  </label>
                  <TextInput
                    id="checkout-coupon"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void applyCoupon();
                      }
                    }}
                    placeholder="Enter code"
                    maxLength={40}
                    autoCapitalize="characters"
                    autoComplete="off"
                    disabled={couponStatus === "applying"}
                    className="h-12 flex-1 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    disabled={couponStatus === "applying" || couponInput.trim().length === 0}
                    className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-glow/50 bg-violet-glow/10 px-4 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-violet-soft transition-colors hover:bg-violet-glow/20 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {couponStatus === "applying" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Checking
                      </>
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
              )}
              {couponMessage && (
                <p
                  role={couponStatus === "error" ? "alert" : "status"}
                  aria-live="polite"
                  className={cn(
                    "mt-2 text-[0.75rem] leading-relaxed",
                    couponStatus === "error" ? "text-error" : "text-success"
                  )}
                >
                  {couponMessage}
                </p>
              )}
            </section>

            <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium text-foreground">{formatAED(totals.subtotal)}</dd>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <BadgePercent className="size-3.5 text-violet-soft" aria-hidden="true" />
                    Promo {appliedCoupon.code}
                  </dt>
                  <dd className="font-medium text-violet-soft">−{formatAED(appliedCoupon.discount)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{config.methods[deliveryMethod].label}</dt>
                <dd className="font-medium text-foreground">{deliveryFee === 0 ? "Free" : formatAED(deliveryFee)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-display text-xl font-bold text-foreground">{formatAED(total)}</dd>
              </div>
            </dl>

            {submitError && (
              <div className="mt-4">
                <FormError>{submitError}</FormError>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || purchasableCount === 0 || hasBlocked}
              className="neon-glow-btn hover:neon-glow-btn-hover mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Placing order…
                </>
              ) : (
                "Place order"
              )}
            </button>
            <p aria-live="polite" className="mt-3 text-center text-[0.72rem] leading-relaxed text-muted-foreground">
              {hasBlocked
                ? "Remove the unavailable items in your cart to place this order."
                : `${purchasableCount} ${purchasableCount === 1 ? "item" : "items"} · ${formatAED(total)} total · 18+ ID check on delivery`}
            </p>

            {/* WhatsApp ordering channel */}
            <div className="mt-5 border-t border-line pt-5">
              <p className="text-center text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Prefer to order on WhatsApp?
              </p>
              <WhatsAppOrderButton
                className="mt-3"
                label="Send order via WhatsApp"
                disabled={purchasableCount === 0}
                onOpen={() => {
                  const v = form.getValues();
                  openWhatsApp(
                    composeCheckoutMessage(cart, totalWithoutCoupon, {
                      fullName: v.fullName || undefined,
                      phone: v.phone || undefined,
                      emirate: v.emirate || undefined,
                      city: v.city || undefined,
                      street: v.street || undefined,
                      deliveryMethod: v.deliveryMethod,
                      paymentMethod: v.paymentMethod,
                      note: v.note || undefined,
                    })
                  );
                }}
              />
              <p className="mt-2.5 text-center text-[0.7rem] leading-relaxed text-muted-foreground">
                Opens a chat with {getWhatsAppDisplay()} — your items, totals and any details you've filled in are
                pre-written. You confirm everything in the chat before anything is final.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </PageContainer>
  );
}
