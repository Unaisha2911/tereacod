/**
 * Site-wide date/number formatting helpers.
 *
 * Every date is formatted against Asia/Dubai with the en-AE locale so
 * server and client renders agree regardless of the viewer's timezone
 * (UAE shop — Dubai time is the business timezone).
 */

const dateFormatter = new Intl.DateTimeFormat("en-AE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dubai",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-AE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Dubai",
});

/** "18 Dec 2024" */
export function formatDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return typeof iso === "string" ? iso : "";
  try {
    return dateFormatter.format(date);
  } catch {
    return typeof iso === "string" ? iso.slice(0, 10) : "";
  }
}

/** "18 Dec 2024, 14:32" */
export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return typeof iso === "string" ? iso : "";
  try {
    return dateTimeFormatter.format(date);
  } catch {
    return typeof iso === "string" ? iso.slice(0, 10) : "";
  }
}

/** "Aura 700 — Arctic Mint ×2 · Halo Pod Kit — Graphite ×1 (+1 more)" */
export function formatItemsPreview(
  preview: Array<{ name: string; quantity: number }>,
  itemCount: number
): string {
  const rendered = preview.map((p) => `${p.name} ×${p.quantity}`).join(" · ");
  const missing = itemCount - preview.length;
  return missing > 0 ? `${rendered} (+${missing} more)` : rendered;
}
