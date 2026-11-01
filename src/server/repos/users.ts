/**
 * TereaCOD — users repository (registration, authentication, account data).
 */

import { getDb } from "@/server/db/client";
import { newId, sha256Hex } from "@/server/ids";
import { hashPassword, verifyPassword } from "@/server/password";
import {
  EMAIL_TOKEN_TTL_MS,
  RESET_TOKEN_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
} from "@/server/env";
import type { AccountPreferences, UserProfile } from "@/types";

export interface UserRow {
  id: string;
  email: string;
  email_verified_at: string | null;
  password_hash: string | null;
  display_name: string;
  phone: string | null;
  date_of_birth: string | null;
  status: string;
  locale: string;
  marketing_opt_in: number;
  last_login_at: string | null;
  created_at: string;
}

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "email_taken" };

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  dateOfBirth?: string;
  marketingOptIn?: boolean;
}): Promise<RegisterResult> {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();
  const existing = await db.get<{ id: string }>(`SELECT id FROM users WHERE email = ?`, [email]);
  if (existing) return { ok: false, reason: "email_taken" };

  const now = new Date().toISOString();
  const userId = newId("usr");
  const passwordHash = await hashPassword(input.password);

  await db.batch([
    {
      sql: `INSERT INTO users
              (id, email, password_hash, display_name, phone, date_of_birth, status, locale,
               marketing_opt_in, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', 'en-AE', ?, ?, ?)`,
      params: [
        userId,
        email,
        passwordHash,
        input.displayName.trim(),
        input.phone ?? null,
        input.dateOfBirth ?? null,
        input.marketingOptIn ? 1 : 0,
        now,
        now,
      ],
    },
    {
      sql: `INSERT INTO auth_identities (id, user_id, provider, provider_user_id, created_at)
            VALUES (?, ?, 'password', ?, ?)`,
      params: [newId("aut"), userId, email, now],
    },
    {
      sql: `INSERT INTO user_preferences (user_id, updated_at) VALUES (?, ?)`,
      params: [userId, now],
    },
  ]).catch(async (error) => {
    // Two concurrent registrations can both pass the check-then-insert window;
    // the UNIQUE(email) constraint is the arbiter — surface it as a 409, not a 500.
    const clash = await db.get<{ id: string }>(`SELECT id FROM users WHERE email = ?`, [email]);
    if (clash) return;
    throw error;
  });
  const clash = await db.get<{ id: string }>(`SELECT id FROM users WHERE email = ?`, [email]);
  if (clash && clash.id !== userId) return { ok: false, reason: "email_taken" };

  return { ok: true, userId };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const db = await getDb();
  return db.get<UserRow>(`SELECT * FROM users WHERE email = ?`, [email.trim().toLowerCase()]);
}

export type AuthResult = { ok: true; user: UserRow } | { ok: false; reason: "invalid" | "suspended" };

export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) return { ok: false, reason: "invalid" };
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return { ok: false, reason: "invalid" };
  if (user.status !== "active") return { ok: false, reason: "suspended" };
  await (await getDb()).run(`UPDATE users SET last_login_at = ? WHERE id = ?`, [
    new Date().toISOString(),
    user.id,
  ]);
  return { ok: true, user };
}

/* --------------------------------- profile -------------------------------- */

export function toUserProfile(row: UserRow): UserProfile {
  const initials = row.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone ?? undefined,
    joinedAt: row.created_at,
    initials: initials || "VU",
    verification: row.email_verified_at ? "verified" : "unverified",
    locale: row.locale,
  };
}

export async function getUserById(id: string): Promise<UserRow | null> {
  return (await getDb()).get<UserRow>(`SELECT * FROM users WHERE id = ?`, [id]);
}

export async function updateProfile(
  userId: string,
  patch: { displayName?: string; phone?: string | null; locale?: string }
): Promise<void> {
  const db = await getDb();
  const updates: string[] = [];
  const params: unknown[] = [];
  if (patch.displayName !== undefined) {
    updates.push(`display_name = ?`);
    params.push(patch.displayName.trim());
  }
  if (patch.phone !== undefined) {
    updates.push(`phone = ?`);
    params.push(patch.phone);
  }
  if (patch.locale !== undefined) {
    updates.push(`locale = ?`);
    params.push(patch.locale);
  }
  if (updates.length === 0) return;
  updates.push(`updated_at = ?`);
  params.push(new Date().toISOString(), userId);
  await db.run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
}

/* ------------------------------- preferences ------------------------------ */

export async function getPreferences(userId: string): Promise<AccountPreferences> {
  const db = await getDb();
  const row = await db.get<{
    language: string;
    product_updates: number;
    order_updates: number;
    research_invites: number;
    personalization: number;
    analytics: number;
    reduced_motion: number;
  }>(`SELECT * FROM user_preferences WHERE user_id = ?`, [userId]);
  if (!row) {
    return {
      language: "en-AE",
      communications: { productUpdates: true, orderUpdates: true, researchInvites: false },
      privacy: { personalization: true, analytics: false },
      accessibility: { reducedMotion: false },
    };
  }
  return {
    language: row.language,
    communications: {
      productUpdates: row.product_updates === 1,
      orderUpdates: row.order_updates === 1,
      researchInvites: row.research_invites === 1,
    },
    privacy: {
      personalization: row.personalization === 1,
      analytics: row.analytics === 1,
    },
    accessibility: { reducedMotion: row.reduced_motion === 1 },
  };
}

export interface PreferencePatch {
  language?: string;
  communications?: {
    productUpdates?: boolean;
    orderUpdates?: boolean;
    researchInvites?: boolean;
  };
  privacy?: {
    personalization?: boolean;
    analytics?: boolean;
  };
  accessibility?: {
    reducedMotion?: boolean;
  };
}

export async function updatePreferences(
  userId: string,
  patch: PreferencePatch
): Promise<AccountPreferences> {
  const db = await getDb();
  const updates: string[] = [];
  const params: unknown[] = [];
  if (patch.language !== undefined) {
    updates.push(`language = ?`);
    params.push(patch.language);
  }
  if (patch.communications?.productUpdates !== undefined) {
    updates.push(`product_updates = ?`);
    params.push(patch.communications.productUpdates ? 1 : 0);
  }
  if (patch.communications?.orderUpdates !== undefined) {
    updates.push(`order_updates = ?`);
    params.push(patch.communications.orderUpdates ? 1 : 0);
  }
  if (patch.communications?.researchInvites !== undefined) {
    updates.push(`research_invites = ?`);
    params.push(patch.communications.researchInvites ? 1 : 0);
  }
  if (patch.privacy?.personalization !== undefined) {
    updates.push(`personalization = ?`);
    params.push(patch.privacy.personalization ? 1 : 0);
  }
  if (patch.privacy?.analytics !== undefined) {
    updates.push(`analytics = ?`);
    params.push(patch.privacy.analytics ? 1 : 0);
  }
  if (patch.accessibility?.reducedMotion !== undefined) {
    updates.push(`reduced_motion = ?`);
    params.push(patch.accessibility.reducedMotion ? 1 : 0);
  }
  if (updates.length > 0) {
    updates.push(`updated_at = ?`);
    params.push(new Date().toISOString(), userId);
    await db.run(`UPDATE user_preferences SET ${updates.join(", ")} WHERE user_id = ?`, params);
  }
  return getPreferences(userId);
}

/* -------------------------------- sessions -------------------------------- */

export interface SessionView {
  id: string;
  device: string;
  current: boolean;
  lastActive: string;
}

export async function listSessions(userId: string, currentSessionId?: string): Promise<SessionView[]> {
  const db = await getDb();
  const rows = await db.all<{
    id: string;
    device_label: string | null;
    last_seen_at: string;
    revoked_at: string | null;
  }>(
    `SELECT id, device_label, last_seen_at, revoked_at FROM sessions
     WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
     ORDER BY last_seen_at DESC`,
    [userId, new Date().toISOString()]
  );
  return rows.map((row) => ({
    id: row.id,
    device: row.device_label ?? "Unknown device",
    current: row.id === currentSessionId,
    lastActive: relativeTime(row.last_seen_at),
  }));
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-AE");
}

/* ----------------------------- password reset ----------------------------- */

/**
 * Password reset + email verification use 6-digit OTP codes: hashed at rest,
 * single-use, short-lived, resend-cooled, and locked after too many wrong
 * tries (OTP_MAX_ATTEMPTS). A new send invalidates the previous code, so
 * exactly one code is ever live per user per flow.
 */

export type CreateOtpResult = { ok: true; code: string } | { ok: false; reason: "cooldown" };

function generateOtpCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

export type OtpVerifyResult = "ok" | "invalid" | "locked";

/** Issue a fresh OTP for a flow ("reset" or "email"), enforcing the cooldown. */
async function createOtp(
  userId: string,
  table: "email_verification_tokens" | "password_reset_tokens",
  ttlMs: number
): Promise<CreateOtpResult> {
  const db = await getDb();
  const latest = await db.get<{ created_at: string }>(
    `SELECT created_at FROM ${table} WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (latest && Date.now() - new Date(latest.created_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }

  // Single live code per user per flow: drop any previous unconsumed codes.
  await db.run(`DELETE FROM ${table} WHERE user_id = ? AND used_at IS NULL`, [userId]);

  const code = generateOtpCode();
  await db.run(
    `INSERT INTO ${table} (id, user_id, token_hash, expires_at, attempts, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [
      newId(table === "password_reset_tokens" ? "prt" : "evt"),
      userId,
      await sha256Hex(code),
      new Date(Date.now() + ttlMs).toISOString(),
      new Date().toISOString(),
    ]
  );
  return { ok: true, code };
}

/** Shared wrong-code path: count the attempt, lock the code when exhausted. */
async function recordOtpFailure(
  table: "email_verification_tokens" | "password_reset_tokens",
  rowId: string,
  attempts: number
): Promise<"invalid" | "locked"> {
  const next = attempts + 1;
  const locked = next >= OTP_MAX_ATTEMPTS;
  await (await getDb()).run(
    `UPDATE ${table} SET attempts = ?, used_at = ? WHERE id = ?`,
    [next, locked ? new Date().toISOString() : null, rowId]
  );
  return locked ? "locked" : "invalid";
}

export async function createPasswordResetOtp(userId: string): Promise<CreateOtpResult> {
  return createOtp(userId, "password_reset_tokens", RESET_TOKEN_TTL_MS);
}

export type PasswordResetResult =
  | { status: "ok"; userId: string }
  | { status: "invalid" | "locked" };

export async function consumePasswordResetOtp(
  email: string,
  code: string,
  newPassword: string
): Promise<PasswordResetResult> {
  const user = await findUserByEmail(email);
  if (!user) return { status: "invalid" };

  const db = await getDb();
  const row = await db.get<{ id: string; attempts: number; expires_at: string; token_hash: string }>(
    `SELECT id, attempts, expires_at, token_hash FROM password_reset_tokens
     WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [user.id]
  );
  if (!row) return { status: "invalid" };
  if (row.expires_at < new Date().toISOString()) {
    await db.run(`UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      row.id,
    ]);
    return { status: "invalid" };
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { status: "locked" };

  if ((await sha256Hex(code)) !== row.token_hash) {
    return { status: await recordOtpFailure("password_reset_tokens", row.id, row.attempts) };
  }

  const now = new Date().toISOString();
  await db.batch([
    {
      sql: `UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`,
      params: [now, row.id],
    },
    {
      sql: `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      params: [await hashPassword(newPassword), now, user.id],
    },
  ]);
  return { status: "ok", userId: user.id };
}

/* --------------------------- email verification --------------------------- */

export async function createEmailVerificationOtp(userId: string): Promise<CreateOtpResult> {
  return createOtp(userId, "email_verification_tokens", EMAIL_TOKEN_TTL_MS);
}

export async function consumeEmailVerificationOtp(email: string, code: string): Promise<OtpVerifyResult> {
  const user = await findUserByEmail(email);
  if (!user) return "invalid";

  const db = await getDb();
  const row = await db.get<{ id: string; attempts: number; expires_at: string; token_hash: string }>(
    `SELECT id, attempts, expires_at, token_hash FROM email_verification_tokens
     WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [user.id]
  );
  if (!row) return "invalid";
  if (row.expires_at < new Date().toISOString()) {
    await db.run(`UPDATE email_verification_tokens SET used_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      row.id,
    ]);
    return "invalid";
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) return "locked";

  if ((await sha256Hex(code)) !== row.token_hash) {
    return recordOtpFailure("email_verification_tokens", row.id, row.attempts);
  }

  const now = new Date().toISOString();
  await db.batch([
    {
      sql: `UPDATE email_verification_tokens SET used_at = ? WHERE id = ?`,
      params: [now, row.id],
    },
    {
      sql: `UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?`,
      params: [now, now, user.id],
    },
  ]);
  return "ok";
}

/* ------------------------------- saved items ------------------------------ */

export async function listSavedItemIds(userId: string): Promise<Array<{ itemId: string; savedAt: string }>> {
  const db = await getDb();
  const rows = await db.all<{ product_id: string; saved_at: string }>(
    `SELECT product_id, saved_at FROM saved_items WHERE user_id = ? ORDER BY saved_at DESC`,
    [userId]
  );
  return rows.map((row) => ({ itemId: row.product_id, savedAt: row.saved_at }));
}

export async function toggleSavedItem(userId: string, productId: string): Promise<"added" | "removed"> {
  const db = await getDb();
  const existing = await db.get<{ product_id: string }>(
    `SELECT product_id FROM saved_items WHERE user_id = ? AND product_id = ?`,
    [userId, productId]
  );
  if (existing) {
    await db.run(`DELETE FROM saved_items WHERE user_id = ? AND product_id = ?`, [userId, productId]);
    return "removed";
  }
  await db.run(
    `INSERT INTO saved_items (user_id, product_id, saved_at) VALUES (?, ?, ?)`,
    [userId, productId, new Date().toISOString()]
  );
  return "added";
}

export async function removeSavedItem(userId: string, productId: string): Promise<void> {
  await (await getDb()).run(`DELETE FROM saved_items WHERE user_id = ? AND product_id = ?`, [userId, productId]);
}

/* ---------------------------- privacy requests ---------------------------- */

export async function createPrivacyRequest(
  userId: string,
  email: string,
  kind: "access" | "deletion"
): Promise<void> {
  await (await getDb()).run(
    `INSERT INTO privacy_requests (id, user_id, email, kind, status, requested_at)
     VALUES (?, ?, ?, ?, 'received', ?)`,
    [newId("prv"), userId, email, kind, new Date().toISOString()]
  );
}
