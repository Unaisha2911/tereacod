/**
 * TereaCOD — session core (pure functions, no request context).
 *
 * Opaque 256-bit tokens; only sha256(token) is stored. Cookie value is
 * `token.signature` (HMAC-SHA256 with SESSION_SIGNING_KEY) so tampered
 * cookies are rejected before any DB lookup.
 */

import { getDb } from "@/server/db/client";
import { newId, newToken, sha256Hex } from "@/server/ids";
import { SESSION_SIGNING_KEY, SESSION_ABSOLUTE_MS, SESSION_TTL_MS } from "@/server/env";

/* ------------------------------ signed values ----------------------------- */

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_SIGNING_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return b64urlEncode(new Uint8Array(sig));
}

/** Sign a cookie payload: `<payload>.<hmac>` */
export async function signValue(payload: string): Promise<string> {
  return `${payload}.${await hmac(payload)}`;
}

/** Constant-time string comparison for secret material (signatures, MACs). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Verify + split a signed cookie value. Returns null when tampered. */
export async function verifySignedValue(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await hmac(payload);
  return timingSafeEqualStr(sig, expected) ? payload : null;
}

/* -------------------------------- sessions -------------------------------- */

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  deviceLabel: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  status: string;
  locale: string;
  emailVerified: boolean;
  dateOfBirth: string | null;
  createdAt: string;
}

export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null }
): Promise<{ token: string; session: SessionRecord }> {
  const db = await getDb();
  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  const deviceLabel = deriveDeviceLabel(meta.userAgent ?? null);
  const session: SessionRecord = {
    id: newId("ses"),
    userId,
    createdAt: now.toISOString(),
    expiresAt,
    deviceLabel,
  };

  await db.run(
    `INSERT INTO sessions (id, user_id, token_hash, ip, user_agent, device_label, created_at, last_seen_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      userId,
      tokenHash,
      meta.ip ?? null,
      meta.userAgent ?? null,
      deviceLabel,
      session.createdAt,
      session.createdAt,
      expiresAt,
    ]
  );

  return { token, session };
}

function deriveDeviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  const os = ua.includes("iphone")
    ? "iPhone"
    : ua.includes("ipad")
      ? "iPad"
      : ua.includes("android")
        ? "Android"
        : ua.includes("mac os")
          ? "Mac"
          : ua.includes("windows")
            ? "Windows"
            : "Device";
  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome") && !ua.includes("edg")
      ? "Chrome"
      : ua.includes("safari") && !ua.includes("chrome")
        ? "Safari"
        : ua.includes("firefox")
          ? "Firefox"
          : "Browser";
  return `${os} · ${browser}`;
}

export async function findSessionByToken(token: string): Promise<{
  session: { id: string; userId: string; createdAt: string; expiresAt: string; lastSeenAt: string };
  user: CurrentUser;
} | null> {
  const db = await getDb();
  const tokenHash = await sha256Hex(token);
  const row = await db.get<{
    id: string;
    user_id: string;
    session_created_at: string;
    expires_at: string;
    last_seen_at: string;
    revoked_at: string | null;
    email: string;
    display_name: string;
    phone: string | null;
    status: string;
    locale: string;
    email_verified_at: string | null;
    date_of_birth: string | null;
    created_at: string;
  }>(
    `SELECT s.id, s.user_id, s.created_at AS session_created_at, s.expires_at, s.last_seen_at, s.revoked_at,
            u.email, u.display_name, u.phone, u.status, u.locale,
            u.email_verified_at, u.date_of_birth, u.created_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`,
    [tokenHash]
  );
  if (!row || row.revoked_at) return null;
  if (row.expires_at < new Date().toISOString()) return null;
  if (row.status !== "active") return null;

  return {
    session: {
      id: row.id,
      userId: row.user_id,
      createdAt: row.session_created_at,
      expiresAt: row.expires_at,
      lastSeenAt: row.last_seen_at,
    },
    user: {
      id: row.user_id,
      email: row.email,
      displayName: row.display_name,
      phone: row.phone,
      status: row.status,
      locale: row.locale,
      emailVerified: row.email_verified_at !== null,
      dateOfBirth: row.date_of_birth,
      createdAt: row.created_at,
    },
  };
}

/**
 * Throttled last_seen touch with sliding expiry: extends the session to a
 * full TTL from now, capped by the absolute lifetime from creation
 * (SESSION_ABSOLUTE_MS). At most once per 5 minutes per session.
 */
export async function touchSession(session: {
  id: string;
  lastSeenAt: string;
  createdAt: string;
  expiresAt: string;
}): Promise<void> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  if (session.lastSeenAt > fiveMinAgo) return;
  const now = new Date();
  const candidateExpires = Math.min(
    now.getTime() + SESSION_TTL_MS,
    new Date(session.createdAt).getTime() + SESSION_ABSOLUTE_MS
  );
  const db = await getDb();
  if (candidateExpires <= new Date(session.expiresAt).getTime()) {
    await db.run(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`, [
      now.toISOString(),
      session.id,
    ]);
    return;
  }
  await db.run(
    `UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ? AND revoked_at IS NULL`,
    [now.toISOString(), new Date(candidateExpires).toISOString(), session.id]
  );
}

export async function revokeSession(sessionId: string): Promise<void> {
  await (await getDb()).run(`UPDATE sessions SET revoked_at = ? WHERE id = ?`, [
    new Date().toISOString(),
    sessionId,
  ]);
}

/**
 * Ownership-scoped revoke: a session can only be revoked by its owner.
 * Returns true when a row was revoked, false when the id does not belong to
 * the user (prevents the horizontal session-revoke IDOR).
 */
export async function revokeOwnedSession(sessionId: string, userId: string): Promise<boolean> {
  const result = await (await getDb()).run(
    `UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
    [new Date().toISOString(), sessionId, userId]
  );
  return result.changes > 0;
}

export async function revokeAllSessionsForUser(userId: string, exceptSessionId?: string): Promise<void> {
  const db = await getDb();
  if (exceptSessionId) {
    await db.run(
      `UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL`,
      [new Date().toISOString(), userId, exceptSessionId]
    );
  } else {
    await db.run(`UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, [
      new Date().toISOString(),
      userId,
    ]);
  }
}
