/**
 * SEARCH KEYWORD COMPOSER (pure — safe for client bundles, repos and the
 * seed script alike).
 *
 * The storefront search runs a SQLite FTS5 index (product_fts / _idx) over
 * five columns: name, brand, tagline, description, keywords. Name and
 * description come from the editorial copy; the `keywords` column is where
 * CONTEXTUAL searchability lives — the terms a visitor types that never
 * appear verbatim in the product title:
 *
 *   • sourcing origin lines ("Japan", "Switzerland (Duty Free)")
 *   • origin/flavour variant labels ("Indonesia", "Purple Wave Indonesia")
 *   • category and model ("TEREA Sticks", "ILUMA i Prime")
 *   • SKU (customer-service lookups: "Where is order TER-AMB-01?")
 *   • admin-authored synonyms/LSI terms ("berry", "fruity", "freezing")
 *
 * This composer merges all of those sources into ONE deduplicated keyword
 * string that the catalog repo writes into product_fts on every create/
 * update (and the seed script writes for every seeded product). Admin
 * keywords stay authoritative — the composed context is APPENDED, never
 * replaced, so console copy always wins.
 */

export interface SearchKeywordInput {
  name: string;
  brand?: string | null;
  /** Admin-authored keywords — authoritative, always included first. */
  keywords?: string | null;
  /** Sourcing line (products.origin column value). */
  origin?: string | null;
  /** Category display name ("TEREA Sticks", "IQOS Devices"). */
  category?: string | null;
  /** Product model string ("ILUMA i Prime"). */
  model?: string | null;
  /** SKU — searchable for support/lookup flows. */
  sku?: string | null;
  /** Nicotine strength chip ("0.5 mg"). */
  nicotineStrength?: string | null;
  /** Variant labels (origin lines, flavours, colours, capacities). */
  variantLabels?: ReadonlyArray<string | null | undefined>;
  /** Extra terms from the caller (seed synonyms that need no DB access). */
  extras?: ReadonlyArray<string | null | undefined>;
}

/** Split on every separator that can appear inside a keyword string. */
function tokenize(value: string): string[] {
  return value
    .split(/[,;|·\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Compose the FTS `keywords` payload: admin keywords first, then variant
 * labels, then the structured context (origin, category, model, SKU,
 * nicotine, brand), deduplicated case-insensitively, original casing kept
 * (FTS tokenization lowercases anyway).
 */
export function composeSearchKeywords(input: SearchKeywordInput): string {
  const ordered: string[] = [];

  const push = (value: string | null | undefined) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!ordered.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      ordered.push(trimmed);
    }
  };

  // 1. Console-authored keywords (comma/pipe separated list possible).
  for (const token of tokenize(input.keywords ?? "")) push(token);
  // 2. Variant labels — origin lines and flavours are the biggest gap in
  //    plain title search ("Japan", "Purple Wave Indonesia", "Menthol").
  for (const label of input.variantLabels ?? []) push(label);
  // 3. Structured context.
  push(input.origin);
  push(input.category);
  push(input.model);
  push(input.sku);
  push(input.nicotineStrength);
  push(input.brand);
  // 4. Caller extras (seed synonym lists etc.).
  for (const extra of input.extras ?? []) push(extra);

  return ordered.join(", ");
}
