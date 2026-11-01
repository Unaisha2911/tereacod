import { withApi, ok } from "@/server/api/guard";
import { revokeAllSessionsForUser } from "@/server/session";
import { logAudit } from "@/server/audit";

export const POST = withApi({ requireAuth: true }, async ({ identity, meta }) => {
  await revokeAllSessionsForUser(identity!.user.id, identity!.sessionId);
  await logAudit({
    actorType: "customer",
    actorId: identity!.user.id,
    actorLabel: identity!.user.displayName,
    action: "auth.sessions_revoked",
    targetType: "user",
    targetId: identity!.user.id,
    detail: "Revoked all other sessions",
    ip: meta.ip,
  });
  return ok({ ok: true });
});
