/**
 * TereaCOD — async job outbox.
 *
 * enqueue() writes to job_queue; drain() processes pending jobs. On Workers
 * the Queue consumer calls drain() on each batch; locally, enqueue() triggers
 * a fire-and-forget drain so behavior is immediate. Email delivery uses the
 * Resend HTTP API when RESEND_API_KEY exists — otherwise the send is recorded
 * in the outbox (status done, payload intact) so the pipeline is observable
 * and testable without credentials.
 */

import { getDb } from "@/server/db/client";
import { newId } from "@/server/ids";
import { RESEND_API_KEY, CONTACT_NOTIFY_EMAIL, EMAIL_FROM } from "@/server/env";

export type JobType = "email.send" | "media.process" | "order.status_notify" | "privacy.execute";

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  notifyOps?: boolean;
}

let draining = false;

export async function enqueue(type: JobType, payload: unknown): Promise<string> {
  const db = await getDb();
  const id = newId("job");
  await db.run(
    `INSERT INTO job_queue (id, type, payload_json, status, created_at) VALUES (?, ?, ?, 'pending', ?)`,
    [id, type, JSON.stringify(payload), new Date().toISOString()]
  );
  // Fire-and-forget local drain; on Workers the response end would cancel
  // pending work, so hand the drain to the request context when available
  // (waitUntil keeps it alive up to 30s after the response).
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    getCloudflareContext().ctx.waitUntil(drainJobs().catch((error) => console.error("[jobs] drain failed:", error)));
  } catch {
    void drainJobs().catch((error) => console.error("[jobs] drain failed:", error));
  }
  return id;
}

async function processEmailSend(payload: EmailPayload): Promise<void> {
  const to = payload.notifyOps && CONTACT_NOTIFY_EMAIL ? CONTACT_NOTIFY_EMAIL : payload.to;
  if (!RESEND_API_KEY) {
    console.log(`[jobs] email (recorded only, no RESEND_API_KEY): to=${to} subject="${payload.subject}"`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject: payload.subject,
      text: payload.text,
      ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend send failed (${response.status})`);
  }
}

async function runJob(type: JobType, payloadJson: string): Promise<void> {
  const payload = JSON.parse(payloadJson);
  switch (type) {
    case "email.send":
      await processEmailSend(payload as EmailPayload);
      break;
    case "media.process":
    case "order.status_notify":
    case "privacy.execute":
      // Handled by their dedicated pipelines; recorded for traceability.
      console.log(`[jobs] ${type} accepted`);
      break;
    default:
      console.warn(`[jobs] unknown job type: ${type}`);
  }
}

/** Process pending jobs (idempotent — safe to call concurrently). */
export async function drainJobs(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    const db = await getDb();
    // Requeue jobs abandoned mid-run (crash between claim and completion).
    await db
      .run(
        `UPDATE job_queue SET status = 'pending', leased_at = NULL
         WHERE status = 'processing' AND (leased_at IS NULL OR leased_at < ?)`,
        [new Date(Date.now() - 10 * 60 * 1000).toISOString()]
      )
      .catch(() => undefined);
    const jobs = await db.all<{ id: string; type: string; payload_json: string }>(
      `SELECT id, type, payload_json FROM job_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 20`
    );
    for (const job of jobs) {
      // CAS claim: two isolates draining concurrently must not both process
      // the same job (duplicate emails / double Resend spend).
      const claimed = await db.run(
        `UPDATE job_queue SET status = 'processing', leased_at = ? WHERE id = ? AND status = 'pending'`,
        [new Date().toISOString(), job.id]
      );
      if (claimed.changes !== 1) continue;
      try {
        await runJob(job.type as JobType, job.payload_json);
        await db.run(`UPDATE job_queue SET status = 'done', processed_at = ? WHERE id = ?`, [
          new Date().toISOString(),
          job.id,
        ]);
      } catch (error) {
        const attempts = await db.get<{ attempts: number }>(
          `SELECT attempts FROM job_queue WHERE id = ?`,
          [job.id]
        );
        const nextAttempts = (attempts?.attempts ?? 0) + 1;
        await db
          .run(
            `UPDATE job_queue SET attempts = ?, status = ?, error = ?, processed_at = ? WHERE id = ?`,
            [
              nextAttempts,
              nextAttempts >= 3 ? "failed" : "pending",
              (error as Error).message,
              new Date().toISOString(),
              job.id,
            ]
          )
          .catch(() => undefined);
      }
    }
  } finally {
    draining = false;
  }
}
