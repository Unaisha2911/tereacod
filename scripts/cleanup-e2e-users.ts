/**
 * Remove the throwaway users created by scripts/e2e-auth-audit.mjs
 * (emails starting with "e2e-" or "weak-") and every row that references
 * them. Dev-database hygiene only — never touches real accounts.
 *
 * Usage: bun scripts/cleanup-e2e-users.ts
 */
import { getLocalDb, closeLocalDb } from "../src/server/db/local";

const db = (await getLocalDb()).raw();
const rows = db
  .prepare(`SELECT id, email FROM users WHERE email LIKE 'e2e-%' OR email LIKE 'weak-%'`)
  .all() as Array<{ id: string; email: string }>;

for (const user of rows) {
  for (const sql of [
    `DELETE FROM sessions WHERE user_id = ?`,
    `DELETE FROM auth_identities WHERE user_id = ?`,
    `DELETE FROM user_preferences WHERE user_id = ?`,
    `DELETE FROM user_roles WHERE user_id = ?`,
    `DELETE FROM password_reset_tokens WHERE user_id = ?`,
    `DELETE FROM email_verification_tokens WHERE user_id = ?`,
    `DELETE FROM saved_items WHERE user_id = ?`,
    `UPDATE carts SET user_id = NULL WHERE user_id = ?`,
    `DELETE FROM users WHERE id = ?`,
  ]) {
    db.prepare(sql).run(user.id);
  }
  console.log(`removed ${user.email}`);
}

console.log(rows.length === 0 ? "no e2e users to clean" : `done — ${rows.length} user(s) removed`);
closeLocalDb();
