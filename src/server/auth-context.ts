/**
 * TereaCOD — request-context auth helpers (server components + route handlers).
 */

import { cookies, headers } from "next/headers";
import { SESSION_COOKIE } from "@/server/env";
import { verifySignedValue, findSessionByToken, touchSession, type CurrentUser } from "@/server/session";
import { getUserPermissionSet, type UserRoles } from "@/server/rbac";

export interface RequestIdentity {
  user: CurrentUser;
  roles: UserRoles;
  sessionId: string;
}

/**
 * Resolve the current session from cookies. Returns null for anonymous
 * visitors or invalid/expired/revoked sessions.
 */
export async function getCurrentIdentity(): Promise<RequestIdentity | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const token = await verifySignedValue(raw);
  if (!token) return null;

  const found = await findSessionByToken(token);
  if (!found) return null;

  void touchSession(found.session).catch(() => undefined);

  const roles = await getUserPermissionSet(found.user.id);
  return { user: found.user, roles, sessionId: found.session.id };
}


/** Request metadata for sessions/audit (route handlers only). */
export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  return {
    // Rate limiting and audit key on this value — it must never be spoofable.
    // On Cloudflare the edge sets cf-connecting-ip; a raw x-forwarded-for is
    // only honoured for loopback/private addresses (local dev proxies).
    // Everything else collapses into the shared "anon" bucket — the safe
    // failure mode.
    ip: clientIp(h),
    userAgent: h.get("user-agent"),
  };
}

function clientIp(h: Headers): string | null {
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = h.get("x-real-ip");
  if (real && isPrivateAddress(real.trim())) return real.trim();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (isPrivateAddress(first)) return first;
  }
  return null;
}

function isPrivateAddress(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}
