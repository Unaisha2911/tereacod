import { z } from "zod";
import { withApi, ok } from "@/server/api/guard";
import { createPrivacyRequest } from "@/server/repos/users";

const bodySchema = z.object({ kind: z.enum(["access", "deletion"]) });

export const POST = withApi({ requireAuth: true }, async ({ request, identity }) => {
  const body = bodySchema.parse(await request.json());
  await createPrivacyRequest(identity!.user.id, identity!.user.email, body.kind);
  return ok({
    received: true,
    message: "Your request has been recorded. Our privacy team will respond within 30 days.",
  });
});
