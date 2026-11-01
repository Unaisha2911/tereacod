import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { adminCustomer, setCustomerStatus } from "@/server/repos/admin";
import { getDb } from "@/server/db/client";
import { logAudit } from "@/server/audit";

const patchSchema = z.object({
  status: z.enum(["active", "suspended", "pending"]),
  /** Optional free-text justification, surfaced in the audit trail. */
  reason: z.string().trim().max(200).optional(),
});

export const PATCH = withApi(
  { requirePermission: "customers.manage" },
  async ({ request, params, identity, meta }) => {
    const body = patchSchema.parse(await request.json());
    // Guard rail: staff accounts cannot be suspended from the customer
    // console — that would let a customer-manager lock the ops team out.
    if (body.status !== "active") {
      const db = await getDb();
      const staff = await db.get<{ c: number }>(
        `SELECT COUNT(*) AS c FROM user_roles WHERE user_id = ?`,
        [params.id]
      );
      if ((staff?.c ?? 0) > 0) {
        return fail(403, ErrorCode.FORBIDDEN, "Staff accounts are managed through staff management.");
      }
    }
    const changed = await setCustomerStatus(params.id, body.status);
    if (!changed) return fail(404, ErrorCode.NOT_FOUND, "No customer found with this id.");
    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "customer.status",
      targetType: "user",
      targetId: params.id,
      severity: "warning",
      detail: body.reason
        ? `Customer status set to ${body.status} — ${body.reason}`
        : `Customer status set to ${body.status}`,
      after: { status: body.status },
      ip: meta.ip,
    });
    return ok(await adminCustomer(params.id));
  }
);
