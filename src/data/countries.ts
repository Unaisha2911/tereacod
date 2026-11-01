/**
 * TereaCOD — country reference list.
 *
 * Suggestion source for the admin product "Origins" editor (datalist).
 * Free-text is still accepted — the list only accelerates typing and keeps
 * spellings consistent across the catalog. The product-level Origin field
 * uses the fixed dropdown in src/lib/catalog-origin.ts instead.
 *
 * Active markets (2026-11): Uzbekistan, Tajikistan, Kyrgyzstan, Indonesia,
 * Switzerland (Duty Free), Japan, Italy. To add a country later, append its
 * display name to the array below and deploy — this is a pure code change:
 * no D1 migration, no database touch, existing product data is never affected.
 */
export const COUNTRIES: string[] = [
  "Uzbekistan",
  "Tajikistan",
  "Kyrgyzstan",
  "Indonesia",
  "Switzerland (Duty Free)",
  "Japan",
  "Italy",
];
