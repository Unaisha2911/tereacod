/**
 * TereaCOD — support repository (tickets + threads).
 */

import { getDb } from "@/server/db/client";
import { newId } from "@/server/ids";
import { logAudit } from "@/server/audit";
import type { SupportTicket, TicketMessage, TicketPriority, TicketStatus } from "@/types";

function mapTicket(
  row: Record<string, unknown>,
  messages: TicketMessage[],
  internalNotes: Array<{ id: string; author: string; body: string; at: string }>
): SupportTicket {
  return {
    id: row.id as string,
    reference: row.reference as string,
    subject: row.subject as string,
    category: row.category as string,
    status: row.status as TicketStatus,
    priority: row.priority as TicketPriority,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    requester: row.requester_name as string,
    messages,
    internalNotes: internalNotes.length > 0 ? internalNotes : undefined,
  };
}

export interface TicketQuery {
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  query?: string;
}

export async function listTickets(query: TicketQuery = {}): Promise<SupportTicket[]> {
  const db = await getDb();
  const where: string[] = [`1 = 1`];
  const params: unknown[] = [];
  if (query.status && query.status !== "all") {
    where.push(`status = ?`);
    params.push(query.status);
  }
  if (query.priority && query.priority !== "all") {
    where.push(`priority = ?`);
    params.push(query.priority);
  }
  if (query.query) {
    where.push(`(subject LIKE ? OR reference LIKE ? OR requester_name LIKE ? OR requester_email LIKE ?)`);
    const like = `%${query.query}%`;
    params.push(like, like, like, like);
  }
  const rows = await db.all<Record<string, unknown>>(
    `SELECT * FROM tickets WHERE ${where.join(" AND ")} ORDER BY updated_at DESC`,
    params
  );
  if (rows.length === 0) return [];

  const allMessages = await db.all<{
    ticket_id: string;
    id: string;
    author_type: string;
    author_label: string;
    body: string;
    created_at: string;
  }>(
    `SELECT ticket_id, id, author_type, author_label, body, created_at FROM ticket_messages
     ORDER BY created_at`
  );
  const allNotes = await db.all<{ ticket_id: string; id: string; author_label: string; body: string; created_at: string }>(
    `SELECT n.ticket_id, n.id, u.display_name AS author_label, n.body, n.created_at
     FROM ticket_notes n LEFT JOIN users u ON u.id = n.author_id
     ORDER BY n.created_at`
  );

  return rows.map((row) => {
    const ticketId = row.id as string;
    const messages: TicketMessage[] = allMessages
      .filter((m) => m.ticket_id === ticketId)
      .map((m) => ({
        id: m.id,
        author: m.author_label,
        role: m.author_type as TicketMessage["role"],
        body: m.body,
        at: m.created_at,
      }));
    const notes = allNotes
      .filter((n) => n.ticket_id === ticketId)
      .map((n) => ({ id: n.id, author: n.author_label ?? "Staff", body: n.body, at: n.created_at }));
    return mapTicket(row, messages, notes);
  });
}

export async function getTicket(idOrReference: string): Promise<SupportTicket | null> {
  const tickets = await listTickets();
  return (
    tickets.find((t) => t.id === idOrReference || t.reference === idOrReference) ?? null
  );
}

export async function replyToTicket(
  ticketId: string,
  input: { body: string; authorId?: string | null; authorLabel: string; internal: boolean }
): Promise<SupportTicket | null> {
  const db = await getDb();
  const ticket = await db.get<{ id: string; status: string }>(
    `SELECT id, status FROM tickets WHERE id = ? OR reference = ?`,
    [ticketId, ticketId]
  );
  if (!ticket) return null;
  const now = new Date().toISOString();

  if (input.internal) {
    await db.run(
      `INSERT INTO ticket_notes (id, ticket_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)`,
      [newId("tn"), ticket.id, input.authorId ?? "system", input.body, now]
    );
  } else {
    await db.run(
      `INSERT INTO ticket_messages (id, ticket_id, author_type, author_id, author_label, body, created_at)
       VALUES (?, ?, 'agent', ?, ?, ?, ?)`,
      [newId("tm"), ticket.id, input.authorId ?? null, input.authorLabel, input.body, now]
    );
    // Agent reply moves an open ticket to pending (awaiting customer).
    if (ticket.status === "open") {
      await db.run(`UPDATE tickets SET status = 'pending' WHERE id = ?`, [ticket.id]);
    }
  }
  await db.run(`UPDATE tickets SET updated_at = ? WHERE id = ?`, [now, ticket.id]);

  await logAudit({
    actorType: "admin",
    actorId: input.authorId ?? null,
    actorLabel: input.authorLabel,
    action: input.internal ? "ticket.note" : "ticket.reply",
    targetType: "ticket",
    targetId: ticket.id,
    detail: input.internal ? "Internal note added" : "Reply sent to customer",
  });

  return getTicket(ticket.id);
}

export async function updateTicket(
  ticketId: string,
  patch: { status?: TicketStatus; priority?: TicketPriority },
  actor: { id?: string | null; label: string }
): Promise<SupportTicket | null> {
  const db = await getDb();
  const ticket = await db.get<{ id: string }>(
    `SELECT id FROM tickets WHERE id = ? OR reference = ?`,
    [ticketId, ticketId]
  );
  if (!ticket) return null;
  const updates: string[] = [];
  const params: unknown[] = [];
  if (patch.status) {
    updates.push(`status = ?`);
    params.push(patch.status);
  }
  if (patch.priority) {
    updates.push(`priority = ?`);
    params.push(patch.priority);
  }
  if (updates.length > 0) {
    updates.push(`updated_at = ?`);
    params.push(new Date().toISOString(), ticket.id);
    await db.run(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`, params);
    await logAudit({
      actorType: "admin",
      actorId: actor.id ?? null,
      actorLabel: actor.label,
      action: "ticket.update",
      targetType: "ticket",
      targetId: ticket.id,
      detail: `Ticket updated (${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(", ")})`,
    });
  }
  return getTicket(ticket.id);
}

export interface CreateTicketInput {
  subject: string;
  category: string;
  requesterName: string;
  requesterEmail: string;
  body: string;
  userId?: string | null;
  priority?: TicketPriority;
}

/** Create a ticket from the contact form or account support surface. */
export async function createTicket(input: CreateTicketInput): Promise<string> {
  const db = await getDb();
  const id = newId("tkt");
  const now = new Date().toISOString();
  // Atomic counter read-increment-write in one statement — two concurrent
  // creates can never read the same value (duplicates violate the UNIQUE
  // reference and 500 the contact form).
  const seqRow = await db.get<{ value: number }>(
    `INSERT INTO counters (name, value) VALUES ('ticket_ref', 1)
     ON CONFLICT(name) DO UPDATE SET value = value + 1 RETURNING value`
  );
  const reference = `TKT-${new Date().getFullYear()}-${String(seqRow?.value ?? 1).padStart(4, "0")}`;

  await db.run(
    `INSERT INTO tickets
      (id, reference, user_id, requester_name, requester_email, subject, category, status, priority, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
    [
      id,
      reference,
      input.userId ?? null,
      input.requesterName,
      input.requesterEmail,
      input.subject,
      input.category,
      input.priority ?? "normal",
      now,
      now,
    ]
  );
  await db.run(
    `INSERT INTO ticket_messages (id, ticket_id, author_type, author_id, author_label, body, created_at)
     VALUES (?, ?, 'customer', ?, ?, ?, ?)`,
    [newId("tm"), id, input.userId ?? null, input.requesterName, input.body, now]
  );
  return id;
}
