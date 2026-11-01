import { z } from "zod";
import { withApi, ok } from "@/server/api/guard";
import { readCartToken } from "@/server/api/http";
import { getActiveCart, getCartDetailForCart, deliveryFeeFor } from "@/server/repos/cart";
import { evaluateCouponForOrder } from "@/server/repos/orders";
import { getDeliveryConfig } from "@/server/repos/settings";
import { filsToAED } from "@/server/money";

const bodySchema = z.object({
  deliveryMethod: z.enum(["standard", "express"]),
  emirate: z.string().optional(),
  couponCode: z.string().trim().max(40).optional(),
});

/**
 * POST /api/v1/checkout/quote — authoritative totals for the chosen delivery
 * method and promo code. The client display is an estimate; this is what the
 * order charges.
 *
 * Rate limited: the coupon evaluation returns valid/invalid + reason, so an
 * unthrottled endpoint would be a coupon brute-force oracle.
 */
export const POST = withApi(
  { rateLimit: { limit: 30, windowMs: 10 * 60 * 1000, key: "checkout:quote" } },
  async ({ request, identity }) => {
  const body = bodySchema.parse(await request.json());
  const token = await readCartToken(request);
  const cart = await getActiveCart(token, identity?.user.id ?? null);
  const detail = cart ? await getCartDetailForCart(cart.id) : null;

  const config = await getDeliveryConfig();
  const subtotalFils = detail
    ? Math.round(
        detail.lines.filter((l) => !l.blocked).reduce((sum, l) => sum + l.lineTotal * 100, 0)
      )
    : 0;
  const deliveryFeeFils = deliveryFeeFor(subtotalFils, body.deliveryMethod, config);

  // Promo preview — evaluated by the same server-authoritative rules the
  // order itself will apply, so the quote never lies about the discount.
  let discountFils = 0;
  let coupon: { code: string; valid: boolean; message: string } | null = null;
  if (body.couponCode && body.couponCode.trim() && subtotalFils > 0) {
    const evaluation = await evaluateCouponForOrder({
      code: body.couponCode,
      subtotalFils,
      userId: identity?.user.id ?? null,
      email: identity?.user.email ?? "",
    });
    if (evaluation.ok) {
      discountFils = evaluation.freeDelivery
        ? deliveryFeeFils
        : Math.min(evaluation.discountFils ?? 0, subtotalFils);
      coupon = {
        code: evaluation.code ?? body.couponCode.trim().toUpperCase(),
        valid: true,
        message: evaluation.freeDelivery
          ? "Free delivery applied."
          : `Promo applied — ${filsToAED(discountFils)} AED off.`,
      };
    } else {
      coupon = {
        code: body.couponCode.trim().toUpperCase(),
        valid: false,
        message: evaluation.reason ?? "This promo code is not valid.",
      };
    }
  }

  const totalFils = Math.max(0, subtotalFils - discountFils + deliveryFeeFils);

  return ok({
    subtotal: filsToAED(subtotalFils),
    deliveryFee: filsToAED(deliveryFeeFils),
    discount: filsToAED(discountFils),
    total: filsToAED(totalFils),
    itemCount: detail?.totals.itemCount ?? 0,
    hasBlocked: detail?.hasBlocked ?? false,
    currency: "AED",
    ...(coupon ? { coupon } : {}),
  });
});
