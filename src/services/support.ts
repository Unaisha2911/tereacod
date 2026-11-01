import type { SupportTicket } from "@/types";

/**
 * SUPPORT SERVICE (API-backed) — admin ticket screens.
 */

export interface TicketQuery {
  status?: SupportTicket["status"] | "all";
  priority?: SupportTicket["priority"] | "all";
  query?: string;
}

async function getData<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const body = (await response.json()) as { data: T };
  return body.data;
}

export const supportService = {
  async list(query: TicketQuery = {}): Promise<SupportTicket[]> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.priority) params.set("priority", query.priority);
    if (query.query) params.set("q", query.query);
    const data = await getData<{ items: SupportTicket[] }>(`/api/v1/admin/tickets?${params.toString()}`);
    return data.items;
  },

  async ticket(id: string): Promise<SupportTicket | null> {
    const tickets = await this.list();
    return tickets.find((t) => t.id === id || t.reference === id) ?? null;
  },

  async reply(ticketId: string, body: string, internal = false): Promise<SupportTicket | null> {
    const response = await fetch(`/api/v1/admin/tickets/${encodeURIComponent(ticketId)}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, internal }),
    });
    if (!response.ok) throw new Error("Reply could not be sent.");
    const parsed = (await response.json()) as { data: SupportTicket };
    return parsed.data;
  },

  async update(
    ticketId: string,
    patch: { status?: SupportTicket["status"]; priority?: SupportTicket["priority"] }
  ): Promise<SupportTicket | null> {
    const response = await fetch(`/api/v1/admin/tickets/${encodeURIComponent(ticketId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error("Ticket could not be updated.");
    const parsed = (await response.json()) as { data: SupportTicket };
    return parsed.data;
  },
};
