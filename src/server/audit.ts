/**
 * TereaCOD — audit trail. Every admin mutation, auth event and order state
 * change lands here with before/after context.
 */

import { getDb } from "@/server/db/client";
import { newId } from "@/server/ids";

export type AuditSeverity = "info" | "warning" | "critical";
export type AuditActorType = "admin" | "system" | "customer";

export interface AuditInput {
  actorType: AuditActorType;
  actorId?: string | null;
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: string;
  severity?: AuditSeverity;
  detail: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logAudit(input: AuditInput): Promise<void> {
  const db = await getDb();
  await db
    .run(
      `INSERT INTO audit_events
        (id, at, actor_type, actor_id, actor_label, action, target_type, target_id,
         severity, detail, before_json, after_json, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId("aud"),
        new Date().toISOString(),
        input.actorType,
        input.actorId ?? null,
        input.actorLabel,
        input.action,
        input.targetType,
        input.targetId,
        input.severity ?? "info",
        input.detail,
        input.before === undefined ? null : JSON.stringify(input.before),
        input.after === undefined ? null : JSON.stringify(input.after),
        input.ip ?? null,
        input.userAgent ?? null,
      ]
    )
    .catch(() => {
      // Audit must never break the primary operation; failures surface in logs.
      console.error("[audit] failed to write audit event for", input.action);
    });
}
