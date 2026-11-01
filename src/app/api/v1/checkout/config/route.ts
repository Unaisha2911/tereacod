import { withApi, ok } from "@/server/api/guard";
import { getDeliveryConfig } from "@/server/repos/settings";
import { DELIVERY_METHOD_LABELS } from "@/server/repos/cart";
import { STRIPE_SECRET_KEY } from "@/server/env";

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
      cardOnline: Boolean(STRIPE_SECRET_KEY),
    },
  });
});
