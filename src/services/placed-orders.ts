import { create } from "zustand";
import type { OrderDetail, OrderSummary } from "@/types";
import { isRecord, loadSession, saveSession } from "@/lib/session-storage";

/**
 * PLACED-ORDERS STORE
 * -------------------
 * Record of orders placed during this browsing session (newest first),
 * persisted to sessionStorage so the confirmation page and account
 * order list survive a reload within the same tab. Still honest to the
 * mock-data prototype — close the tab and the session orders are gone;
 * the account order history then shows only the fixed sample records.
 * The future implementation writes to D1 behind an authenticated API
 * and these records appear in orderHistoryService.
 */

interface PlacedOrdersState {
  summaries: OrderSummary[];
  details: Record<string, OrderDetail>;
  /** True once session-persisted orders have been restored client-side. */
  hydrated: boolean;
  /** Prepend a newly placed order (summary + full detail). */
  add: (summary: OrderSummary, detail: OrderDetail) => void;
  clear: () => void;
}

const ORDERS_STORAGE_KEY = "tereacod.orders.v1";

const isSummaryList = (value: unknown): value is OrderSummary[] =>
  Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.reference === "string");

const isDetailMap = (value: unknown): value is Record<string, OrderDetail> =>
  isRecord(value) && Object.values(value).every((item) => isRecord(item) && typeof item.reference === "string");

export const usePlacedOrders = create<PlacedOrdersState>((set) => ({
  summaries: [],
  details: {},
  hydrated: false,
  add: (summary, detail) =>
    set((state) => ({
      summaries: [summary, ...state.summaries],
      details: { ...state.details, [summary.reference]: detail },
    })),
  clear: () => set({ summaries: [], details: {} }),
}));

// Session persistence — same restore-after-hydration pattern as the cart.
if (typeof window !== "undefined") {
  window.setTimeout(() => {
    const summaries = loadSession<OrderSummary[]>(ORDERS_STORAGE_KEY + ":summaries", isSummaryList);
    const details = loadSession<Record<string, OrderDetail>>(ORDERS_STORAGE_KEY + ":details", isDetailMap);
    if (summaries || details) {
      usePlacedOrders.setState({ summaries: summaries ?? [], details: details ?? {}, hydrated: true });
    } else {
      usePlacedOrders.setState({ hydrated: true });
    }
  }, 0);
  usePlacedOrders.subscribe((state) => {
    saveSession(ORDERS_STORAGE_KEY + ":summaries", state.summaries);
    saveSession(ORDERS_STORAGE_KEY + ":details", state.details);
  });
}

/** Service facade — keeps components decoupled from the store internals. */
export const placedOrdersService = {
  list(): OrderSummary[] {
    return usePlacedOrders.getState().summaries;
  },
  byReference(reference: string): { summary: OrderSummary; detail: OrderDetail } | null {
    const state = usePlacedOrders.getState();
    const summary = state.summaries.find((order) => order.reference === reference);
    const detail = state.details[reference];
    if (!summary || !detail) return null;
    return { summary, detail };
  },
  add(summary: OrderSummary, detail: OrderDetail) {
    usePlacedOrders.getState().add(summary, detail);
  },
};
