import { NextResponse } from "next/server";
import { withApi } from "@/server/api/guard";
import { revokeSession } from "@/server/session";
import { clearSessionCookie, clearCartCookie, readCartToken } from "@/server/api/http";
import { logAudit } from "@/server/audit";

export const POST = withApi({}, async ({ request, identity, meta }) => {
  if (identity) {
    await revokeSession(identity.sessionId);
    await logAudit({
      actorType: "customer",
      actorId: identity.user.id,
      actorLabel: identity.user.displayName,
      action: "auth.sign_out",
      targetType: "user",
      targetId: identity.user.id,
      detail: "Signed out",
      ip: meta.ip,
    });
  }
  const response = NextResponse.json({ data: { ok: true } });
  clearSessionCookie(response);
  // Also drop the cart cookie: it may still resolve to a user-tagged cart
  // from the session that just ended (see getActiveCart ownership guard).
  if (await readCartToken(request)) {
    clearCartCookie(response);
  }
  return response;
});
