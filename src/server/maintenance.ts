/**
 * TereaCOD — periodic maintenance sweep.
 *
 * Reclaims database surface that would otherwise grow unbounded:
 *  • jobs stuck in 'processing' (crashed between claim and completion) are
 *    requeued once their lease goes stale (10 minutes),
 *  • expired sessions, password-reset and email-verification tokens,
 *  • consumed idempotency keys past their 24h TTL,
 *  • abandoned guest carts past their expiry.
 *
 * Trigger model: the API guard calls maybeSweep() on a lazy ~once-per-hour
 * cadence (cheap timestamp check). On Cloudflare, a Cron Trigger can call
 * runMaintenanceSweep() directly — see docs/BACKEND-ARCHITECTURE.md §8.
 */

import { getDb } from "@/server/db/client";

const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // at most once per hour
const STALE_LEASE_MS = 10 * 60 * 1000; // processing > 10 min = abandoned

let lastSweepStartedAt = 0;
let sweeping = false;

/** Lazy, throttled entry point — safe to call on every request. */
export async function maybeSweep(): Promise<void> {
  if (sweeping || Date.now() - lastSweepStartedAt < SWEEP_INTERVAL_MS) return;
  lastSweepStartedAt = Date.now();
  sweeping = true;
  try {
    await runMaintenanceSweep();
  } finally {
    sweeping = false;
  }
}

export interface SweepResult {
  requeuedJobs: number;
  expiredSessions: number;
  expiredResetTokens: number;
  expiredVerifyTokens: number;
  expiredIdempotencyKeys: number;
  expiredCarts: number;
}

export async function runMaintenanceSweep(): Promise<SweepResult> {
  const db = await getDb();
  const now = new Date().toISOString();
  const staleLeaseBefore = new Date(Date.now() - STALE_LEASE_MS).toISOString();

  const [requeuedJobs, expiredSessions, expiredResetTokens, expiredVerifyTokens, expiredIdempotencyKeys, cartsGone] =
    await Promise.all([
      db.run(
        `UPDATE job_queue SET status = 'pending', leased_at = NULL
         WHERE status = 'processing' AND (leased_at IS NULL OR leased_at < ?)`,
        [staleLeaseBefore]
      ),
      db.run(`DELETE FROM sessions WHERE expires_at < ?`, [now]),
      db.run(`DELETE FROM password_reset_tokens WHERE expires_at < ?`, [now]),
      db.run(`DELETE FROM email_verification_tokens WHERE expires_at < ?`, [now]),
      db.run(`DELETE FROM idempotency_keys WHERE expires_at < ?`, [now]),
      db
        .run(
          `DELETE FROM carts WHERE status = 'active' AND expires_at < ?`,
          [now]
        )
        .then(async (result) => {
          // Cart items cascade, but honour explicit cleanup for engines where
          // the FK pragma was off during the delete.
          await db
            .run(
              `DELETE FROM cart_items WHERE cart_id NOT IN (SELECT id FROM carts)`
            )
            .catch(() => undefined);
          return result;
        }),
    ]);

  return {
    requeuedJobs: requeuedJobs.changes,
    expiredSessions: expiredSessions.changes,
    expiredResetTokens: expiredResetTokens.changes,
    expiredVerifyTokens: expiredVerifyTokens.changes,
    expiredIdempotencyKeys: expiredIdempotencyKeys.changes,
    expiredCarts: cartsGone.changes,
  };
}
