import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { transitionOrder } from "@/server/repos/orders";

/**
 * The transition target set mirrors OrderStatus exactly (see TRANSITIONS in
 * repos/orders.ts — the state machine itself decides which hops are legal;
 * "returned" was never a real status and always 409'd).
 */
const bodySchema = z.object({
  toStatus: z.enum([
    "placed",
    "confirmed",
    "processing",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  note: z.string().trim().max(500).optional(),
});

/** POST /api/v1/admin/orders/:reference/events — state machine transition. */
export const POST = withApi(
  { requirePermission: "orders.operate" },
  async ({ request, params, identity, meta }) => {
    const body = bodySchema.parse(await request.json());
    const result = await transitionOrder(
      params.reference,
      body.toStatus,
      { id: identity!.user.id, label: identity!.user.displayName },
      body.note
    );
    if (!result.ok) {
      if (result.reason === "not_found") {
        return fail(404, ErrorCode.NOT_FOUND, "No order found with this reference.");
      }
      return fail(
        409,
        ErrorCode.CONFLICT,
        `Cannot move this order from its current status to "${body.toStatus}".`
      );
    }
    return ok({ status: result.status });
  }
);
