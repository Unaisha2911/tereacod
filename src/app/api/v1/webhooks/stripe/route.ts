import { NextResponse } from "next/server";
import { IS_PROD, STRIPE_WEBHOOK_SECRET } from "@/server/env";
import { timingSafeEqualStr } from "@/server/session";
import { getDb } from "@/server/db/client";
import { newId } from "@/server/ids";

/**
 * POST /api/v1/webhooks/stripe — payment lifecycle webhook.
 *
 * Hardened per the QA audit:
 *  • Fails CLOSED — without STRIPE_WEBHOOK_SECRET the endpoint refuses to
 *    process events in production (503) and is a no-op ack in development.
 *    An unsigned endpoint that flips payment status must never exist.
 *  • Signature comparison is constant-time.
 *  • Events that match no payment are acked but write nothing — no orphan
 *    order_events rows (the old code inserted rows with order_id='unmatched').
 *
 * Happy path: payment_intent.succeeded / payment_intent.payment_failed find
 * the payment by provider_ref (written by the Stripe checkout session flow
 * when card payments go live).
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!STRIPE_WEBHOOK_SECRET) {
    if (IS_PROD) {
      return NextResponse.json({ error: { code: "webhook_disabled" } }, { status: 503 });
    }
    return NextResponse.json({ received: false, reason: "stripe_not_configured" }, { status: 202 });
  }

  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: { code: "invalid_signature" } }, { status: 400 });
  }

  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts.t;
  if (!timestamp || !parts.v1) {
    return NextResponse.json({ error: { code: "invalid_signature" } }, { status: 400 });
  }
  const expected = await hmac(`${timestamp}.${raw}`, STRIPE_WEBHOOK_SECRET);
  if (!timingSafeEqualStr(expected, parts.v1)) {
    return NextResponse.json({ error: { code: "invalid_signature" } }, { status: 400 });
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return NextResponse.json({ error: { code: "stale_signature" } }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: { code: "invalid_payload" } }, { status: 400 });
  }

  const providerRef = String(event.data?.object?.id ?? "");
  if (!providerRef) {
    return NextResponse.json({ received: true, matched: false });
  }

  const db = await getDb();
  const payment = await db.get<{ id: string; order_id: string }>(
    `SELECT id, order_id FROM payments WHERE provider_ref = ?`,
    [providerRef]
  );
  if (!payment) {
    // Unknown payment (other account/mode, replayed test event) — ack only.
    return NextResponse.json({ received: true, matched: false });
  }

  let applied: string | null = null;
  switch (event.type) {
    case "payment_intent.succeeded":
      await db.batch([
        { sql: `UPDATE payments SET status = 'captured', updated_at = ? WHERE id = ?`, params: [new Date().toISOString(), payment.id] },
        { sql: `UPDATE orders SET payment_status = 'paid', updated_at = ? WHERE id = ?`, params: [new Date().toISOString(), payment.order_id] },
      ]);
      applied = "captured";
      break;
    case "payment_intent.payment_failed":
      await db.run(`UPDATE payments SET status = 'failed', updated_at = ? WHERE id = ?`, [
        new Date().toISOString(),
        payment.id,
      ]);
      applied = "failed";
      break;
    default:
      // Unhandled types are accepted and acked for observability.
      break;
  }

  if (applied) {
    await db
      .run(
        `INSERT INTO order_events (id, order_id, type, message, actor, at)
         VALUES (?, ?, 'payment', ?, 'stripe', ?)`,
        [newId("oev"), payment.order_id, `Stripe event: ${event.type} — payment ${applied}`, new Date().toISOString()]
      )
      .catch(() => undefined);
  }

  return NextResponse.json({ received: true, matched: true });
}

async function hmac(value: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
