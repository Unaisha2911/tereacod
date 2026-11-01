import { create } from "zustand";
import type { SavedItem } from "@/types";
import { useAuth } from "@/services/account";

/**
 * SAVED-ITEMS STORE (API-backed for signed-in users)
 * --------------------------------------------------
 * Guests: local-only store (honest — nothing authoritative in the browser).
 * Signed-in: every toggle/remove mirrors to /api/v1/account/saved and the
 * list is hydrated from the server at bootstrap. The optimistic store keeps
 * badges and card hearts instant.
 */

interface SavedItemsState {
  items: SavedItem[];
  hydrated: boolean;
  has: (itemId: string) => boolean;
  toggle: (itemId: string) => "added" | "removed";
  remove: (itemId: string) => void;
  clear: () => void;
  setItems: (items: SavedItem[]) => void;
  setHydrated: () => void;
}

export const useSavedItems = create<SavedItemsState>((set, get) => ({
  items: [],
  hydrated: false,
  has: (itemId) => get().items.some((i) => i.itemId === itemId),
  toggle: (itemId) => {
    const exists = get().items.some((i) => i.itemId === itemId);
    set((state) => ({
      items: exists
        ? state.items.filter((i) => i.itemId !== itemId)
        : [...state.items, { itemId, savedAt: new Date().toISOString() }],
    }));
    void syncToggle(itemId, exists);
    return exists ? "removed" : "added";
  },
  remove: (itemId) => {
    set((state) => ({ items: state.items.filter((i) => i.itemId !== itemId) }));
    void syncToggle(itemId, true);
  },
  clear: () => set({ items: [] }),
  setItems: (items) => set({ items }),
  setHydrated: () => set({ hydrated: true }),
}));

async function syncToggle(itemId: string, removing: boolean): Promise<void> {
  try {
    const auth = useAuth.getState();
    if (!auth.hydrated || !auth.user) return; // guest — local only
    if (removing) {
      await fetch(`/api/v1/account/saved?product=${encodeURIComponent(itemId)}`, { method: "DELETE" });
    } else {
      await fetch("/api/v1/account/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: itemId }),
      });
    }
  } catch {
    // Offline — local state stands; sync on next toggle.
  }
}

/** Bootstrap hydration for signed-in users. */
export async function hydrateSavedItemsFromServer(signedIn: boolean): Promise<void> {
  if (!signedIn) {
    useSavedItems.getState().setHydrated();
    return;
  }
  // Push locally-saved (guest) ids up BEFORE the server list replaces local
  // state — otherwise anything bookmarked while signed out is destroyed.
  const localIds = useSavedItems.getState().items.map((i) => i.itemId);
  await Promise.all(
    localIds.map((itemId) =>
      fetch("/api/v1/account/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: itemId }),
      }).catch(() => undefined)
    )
  );
  try {
    const response = await fetch("/api/v1/account/saved", { headers: { accept: "application/json" } });
    if (response.ok) {
      const body = (await response.json()) as { data: { saved: SavedItem[] } };
      useSavedItems.getState().setItems(body.data.saved ?? []);
    }
  } catch {
    // Offline — keep local items.
  } finally {
    useSavedItems.getState().setHydrated();
  }
}

/** Service facade — keeps components decoupled from the store internals. */
export const savedItemsService = {
  async list(): Promise<SavedItem[]> {
    return useSavedItems.getState().items;
  },
  toggle(itemId: string) {
    return useSavedItems.getState().toggle(itemId);
  },
  has(itemId: string) {
    return useSavedItems.getState().has(itemId);
  },
  remove(itemId: string) {
    useSavedItems.getState().remove(itemId);
  },
};
