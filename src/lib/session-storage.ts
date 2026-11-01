/**
 * Session-scoped storage helpers — the persistence layer for the
 * prototype cart and session orders.
 *
 * Uses sessionStorage (not localStorage): state survives reloads and
 * direct navigation within the tab, but stays honest to the mock-data
 * prototype — close the tab and the session is gone. The future D1
 * backend replaces this entirely.
 */

const isClient = typeof window !== "undefined";

export function loadSession<T>(key: string, validate: (value: unknown) => value is T): T | null {
  if (!isClient) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(key: string, value: unknown): void {
  if (!isClient) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota errors / private mode — persistence is best-effort in the prototype.
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
