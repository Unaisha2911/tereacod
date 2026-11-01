import type { OrderDetail, OrderSummary, Paginated } from "@/types";

/**
 * ORDER-HISTORY SERVICE (API-backed) — authenticated customer order records.
 */

export interface OrderQuery {
  status?: OrderSummary["status"] | "all";
  page?: number;
  pageSize?: number;
}

async function getData<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const body = (await response.json()) as { data: T };
  return body.data;
}

export const orderHistoryService = {
  async list(query: OrderQuery = {}): Promise<Paginated<OrderSummary>> {
    const params = new URLSearchParams();
    if (query.status && query.status !== "all") params.set("status", query.status);
    params.set("page", String(query.page ?? 1));
    params.set("pageSize", String(query.pageSize ?? 10));
    return getData<Paginated<OrderSummary>>(`/api/v1/account/orders?${params.toString()}`);
  },

  async detail(reference: string): Promise<OrderDetail | null> {
    try {
      return await getData<OrderDetail>(
        `/api/v1/account/orders/${encodeURIComponent(reference)}`
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) return null;
      throw error;
    }
  },
};
