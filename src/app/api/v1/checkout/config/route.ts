import { withApi, ok } from "@/server/api/guard";
import { getDeliveryConfig } from "@/server/repos/settings";
import { DELIVERY_METHOD_LABELS } from "@/server/repos/cart";

/** GET /api/v1/checkout/config — delivery fees, payment availability. */
export const GET = withApi({}, async () => {
  const delivery = await getDeliveryConfig();
  return ok({
    delivery: {
      freeThreshold: delivery.freeThresholdFils / 100,
      methods: {
        standard: { ...DELIVERY_METHOD_LABELS.standard, fee: delivery.standardFeeFils / 100 },
        express: { ...DELIVERY_METHOD_LABELS.express, fee: delivery.expressFeeFils / 100 },
      },
    },
    payments: {
      cashOnDelivery: true,
      cardOnDelivery: true,
      // Online card is disabled until the Stripe Checkout session flow exists
      // (session creation + payments row + checkout.session webhook). Flip to
      // Boolean(STRIPE_SECRET_KEY) only when that path is complete — creating
      // an order without a payment record would ship goods unpayed.
      cardOnline: false,
    },
  });
});
