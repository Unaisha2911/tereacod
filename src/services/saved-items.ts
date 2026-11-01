import { create } from "zustand";
import type { SavedItem } from "@/types";
import { useAuth } from "@/services/account";

/**
 * SAVED-ITEMS STORE (API-backed for signed-in users)
 * --------------------------------------------------
 * Guests: local store persisted to sessionStorage — the list survives a
 * reload on this device/tab (matching the promise made on /saved) and is
 * pushed to the account at sign-in. Signed-in: every toggle/remove mirrors
 * to /api/v1/account/saved and the list is hydrated from the server at
 * bootstrap. The optimistic store keeps badges and card hearts instant.
 */

const GUEST_SAVED_KEY = "tereacod.saved.v1";

function persistSaved(items: SavedItem[]): void {
  try {
    sessionStorage.setItem(GUEST_SAVED_KEY, JSON.stringify(items));
  } catch {
    // Private mode / quota — persistence is best-effort.
  }
}

function loadPersistedSaved(): SavedItem[] {
  try {
    const raw = sessionStorage.getItem(GUEST_SAVED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is SavedItem =>
        Boolean(i) && typeof (i as SavedItem).itemId === "string" && typeof (i as SavedItem).savedAt === "string"
    );
  } catch {
    return [];
  }
}

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
  items: loadPersistedSaved(),
  hydrated: false,
  has: (itemId) => get().items.some((i) => i.itemId === itemId),
  toggle: (itemId) => {
    const exists = get().items.some((i) => i.itemId === itemId);
    set((state) => ({
      items: exists
        ? state.items.filter((i) => i.itemId !== itemId)
        : [...state.items, { itemId, savedAt: new Date().toISOString() }],
    }));
    persistSaved(get().items);
    void syncToggle(itemId, exists);
    return exists ? "removed" : "added";
  },
  remove: (itemId) => {
    set((state) => ({ items: state.items.filter((i) => i.itemId !== itemId) }));
    persistSaved(get().items);
    void syncToggle(itemId, true);
  },
  clear: () => {
    set({ items: [] });
    persistSaved([]);
  },
  setItems: (items) => {
    set({ items });
    // Keep the session mirror in step (sign-out writes [] here, which
    // wipes the previous session's list on a shared browser).
    persistSaved(items);
  },
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
