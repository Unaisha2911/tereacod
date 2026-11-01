/**
 * TereaCOD — country reference list.
 *
 * Suggestion source for the admin product "Origins" editor (datalist).
 * Free-text is still accepted — the list only accelerates typing and keeps
 * spellings consistent across the catalog.
 *
 * Active markets (2026-10): Uzbekistan, Kyrgyzstan, Tajikistan, Indonesia,
 * Japan. To add a country later, append its display name to the array below
 * and deploy — this is a pure code change: no D1 migration, no database
 * touch, existing product data is never affected.
 */
export const COUNTRIES: string[] = [
  "Uzbekistan",
  "Kyrgyzstan",
  "Tajikistan",
  "Indonesia",
  "Japan",
];
