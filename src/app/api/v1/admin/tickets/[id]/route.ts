import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { updateTicket } from "@/server/repos/support";

const patchSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

export const PATCH = withApi(
  { requirePermission: "support.operate" },
  async ({ request, params, identity }) => {
    const body = patchSchema.parse(await request.json());
    const ticket = await updateTicket(
      params.id,
      body,
      { id: identity!.user.id, label: identity!.user.displayName }
    );
    if (!ticket) return fail(404, ErrorCode.NOT_FOUND, "No ticket found.");
    return ok(ticket);
  }
);
