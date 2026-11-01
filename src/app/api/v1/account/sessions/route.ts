import { withApi, ok } from "@/server/api/guard";
import { listSessions } from "@/server/repos/users";
import { revokeOwnedSession } from "@/server/session";

export const GET = withApi({ requireAuth: true }, async ({ identity }) => {
  const sessions = await listSessions(identity!.user.id, identity!.sessionId);
  return ok({ sessions });
});

/** DELETE /api/v1/account/sessions?id=<sessionId> — revoke one of YOUR sessions. */
export const DELETE = withApi({ requireAuth: true }, async ({ request, identity }) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id === identity!.sessionId) {
    return ok({ ok: false });
  }
  // Ownership-scoped: session ids belonging to other users are not revocable
  // (closes the horizontal session-revoke IDOR found in the QA audit).
  const revoked = await revokeOwnedSession(id, identity!.user.id);
  return ok({ ok: revoked });
});
