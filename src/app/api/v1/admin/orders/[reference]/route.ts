import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { getOrderDetailRow, mapOrderDetail } from "@/server/repos/orders";

export const GET = withApi({ requirePermission: "orders.read" }, async ({ params }) => {
  const row = await getOrderDetailRow(params.reference);
  if (!row) return fail(404, ErrorCode.NOT_FOUND, "No order found with this reference.");
  return ok(mapOrderDetail(row));
});
