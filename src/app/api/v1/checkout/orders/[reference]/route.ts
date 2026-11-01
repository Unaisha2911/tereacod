import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { getOrderDetailRow, mapOrderDetail } from "@/server/repos/orders";

/**
 * GET /api/v1/checkout/orders/:reference — full detail for the session owner
 * only. Guests read the success page from the client-side placed-order cache;
 * this endpoint is for signed-in customers.
 */
export const GET = withApi({ requireAuth: true }, async ({ params, identity }) => {
  const row = await getOrderDetailRow(params.reference);
  if (!row || row.order.user_id !== identity!.user.id) {
    return fail(404, ErrorCode.NOT_FOUND, "No order found with this reference.");
  }
  return ok(mapOrderDetail(row));
});
