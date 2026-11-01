/**
 * TereaCOD — money helpers. All monetary values are stored as INTEGER fils
 * (AED × 100). The UI-level types (CatalogItem.price etc.) express whole-AED
 * or decimal AED numbers, so the API layer converts at the boundary.
 */

/** Convert a UI-level AED amount (whole dirhams in the seed data) to fils. */
export function aedToFils(aed: number): number {
  return Math.round(aed * 100);
}

/** Convert fils to a UI-level AED amount. */
export function filsToAED(fils: number): number {
  return Math.round(fils) / 100;
}

/** Safe addition of fil amounts (avoids float drift in the AED domain). */
