import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { replyToTicket } from "@/server/repos/support";
import { getDb } from "@/server/db/client";
import { enqueue } from "@/server/jobs";

const bodySchema = z.object({
  body: z.string().trim().min(1, "Write a reply first.").max(4000),
  internal: z.boolean().optional(),
});

/**
 * POST /api/v1/admin/tickets/[id]/reply — reply to a support ticket.
 * Internal notes stay staff-only; public replies queue a customer email.
 * (This route was missing while supportService.reply already called it —
 * found and fixed in the QA audit.)
 */
export const POST = withApi(
  { requirePermission: "support.operate" },
  async ({ request, params, identity }) => {
    const body = bodySchema.parse(await request.json());
    const internal = body.internal ?? false;

    const ticket = await replyToTicket(params.id, {
      body: body.body,
      authorId: identity!.user.id,
      authorLabel: identity!.user.displayName,
      internal,
    });
    if (!ticket) return fail(404, ErrorCode.NOT_FOUND, "No ticket found.");

    if (!internal) {
      // Notify the customer (job outbox — Resend when configured).
      const db = await getDb();
      const row = await db.get<{ requester_email: string }>(
        `SELECT requester_email FROM tickets WHERE id = ? OR reference = ?`,
        [params.id, params.id]
      );
      if (row?.requester_email) {
        await enqueue("email.send", {
          to: row.requester_email,
          subject: `Re: ${ticket.subject} [${ticket.reference}]`,
          text: `${body.body}\n\n— ${identity!.user.displayName}, TereaCOD Support`,
        });
      }
    }

    return ok(ticket);
  }
);
