import { z } from "zod";
import { withApi, ok, fail, ErrorCode, created } from "@/server/api/guard";
import { readCartToken } from "@/server/api/http";
import { getActiveCart } from "@/server/repos/cart";
import { createOrder, replayOrder, orderRequestHash } from "@/server/repos/orders";
import { getFeatureFlags } from "@/server/repos/settings";

const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

const bodySchema = z.object({
  contact: z.object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(120),
    email: z.string().email("Enter a valid email address."),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number.")
      .max(24)
      .regex(/^[+\d][\d\s()-]+$/, "Enter a valid phone number."),
  }),
  address: z.object({
    emirate: z
      .string()
      .trim()
      .min(2, "Select an emirate.")
      .max(40)
      .refine((v) => EMIRATES.some((e) => e.toLowerCase() === v.toLowerCase()), "Select an emirate."),
    city: z.string().trim().min(2, "Enter your city.").max(80),
    street: z.string().trim().min(2, "Enter your street address.").max(200),
    building: z.string().trim().max(80).optional(),
    apartment: z.string().trim().max(80).optional(),
    note: z.string().trim().max(500).optional(),
  }),
  deliveryMethod: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["cash-on-delivery", "card-on-delivery", "card", "saved-card"]),
  couponCode: z.string().trim().max(40).nullable().optional(),
  declaredAge18Plus: z.boolean(),
  idempotencyKey: z.string().min(8).max(64),
});

/**
 * POST /api/v1/checkout/orders — place an order (COD-first).
 * Requires an Idempotency-Key; reserves inventory; sends confirmation email.
 */
export const POST = withApi(
  { rateLimit: { limit: 12, windowMs: 10 * 60 * 1000, key: "checkout:orders" } },
  async ({ request, identity, meta }) => {
    const body = bodySchema.parse(await request.json());

    // Idempotency replay first — a retry after a dropped response must return
    // the original order even though the cart has since been converted.
    const { idempotencyKey, ...orderBody } = body;
    const requestHash = await orderRequestHash(orderBody);
    if (idempotencyKey) {
      const replayed = await replayOrder(idempotencyKey, requestHash);
      if (replayed) {
        return ok(replayed, { replayed: true });
      }
    }

    const flags = await getFeatureFlags();
    if (!flags.checkoutEnabled) {
      return fail(503, ErrorCode.UNAVAILABLE, "Checkout is temporarily unavailable.");
    }

    const token = await readCartToken(request);
    const cart = await getActiveCart(token, identity?.user.id ?? null);
    if (!cart) {
      return fail(409, ErrorCode.CONFLICT, "Your bag is empty — add a product from the shop first.");
    }

    const result = await createOrder({
      contact: body.contact,
      address: body.address,
      deliveryMethod: body.deliveryMethod,
      paymentMethod: body.paymentMethod,
      couponCode: body.couponCode ?? null,
      cartId: cart.id,
      userId: identity?.user.id ?? null,
      idempotencyKey: body.idempotencyKey,
      requestHash,
      ip: meta.ip,
      userAgent: meta.userAgent,
      declaredAge18Plus: body.declaredAge18Plus,
    });

    if (!result.ok) {
      switch (result.reason) {
        case "empty_cart":
          return fail(409, ErrorCode.CONFLICT, "Your bag is empty — add a product from the shop first.");
        case "blocked_lines":
          return fail(409, ErrorCode.CONFLICT, `Some items are no longer available. ${result.detail ?? ""}`.trim());
        case "out_of_stock":
          return fail(409, ErrorCode.CONFLICT, `${result.detail ?? "An item"} just sold out — adjust your bag and try again.`);
        case "invalid_coupon":
          return fail(422, ErrorCode.VALIDATION_FAILED, result.detail ?? "This promo code is not valid.", {
            fields: { couponCode: result.detail ?? "This promo code is not valid." },
          });
        case "payment_unavailable":
          return fail(400, ErrorCode.UNAVAILABLE, "Online card payments are not enabled yet — choose cash or card on delivery.");
        case "age_not_declared":
          return fail(422, ErrorCode.VALIDATION_FAILED, "You must confirm you are 18 or older.", {
            fields: { declaredAge18Plus: "Required for nicotine products." },
          });
      }
    }

    return created(result.ok ? result.summary : undefined, {
      orderId: result.ok ? result.reference : undefined,
    });
  }
);
