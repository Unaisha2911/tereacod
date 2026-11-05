"use client";

import Link from "next/link";
import type { OriginChipData } from "@/lib/catalog-origin";

/**
 * SelectedOriginChip — the origin line chip under the product price,
 * reactive to the Origin option picked in the variant picker.
 *
 * The server precomputes a COMPACT resolution table (`OriginChipData` —
 * slug/label/flag only; the full origin lines with their SEO copy never
 * cross the server→client boundary). The chip then follows the shell's
 * selection state:
 *
 *  - an origin variant is selected → show that variant's line and link to
 *    its /origin/<slug> landing page (a Japan/Italy listing flips its chip
 *    to Italy the moment the Italy pill is pressed);
 *  - nothing selected / single-origin listing (the Details origin renders
 *    as a synthetic always-selected pill that never writes selection
 *    state) → show the product-level line, exactly like before.
 *
 * Server-rendered on first paint (the initial selection is deterministic),
 * so the SSR markup already carries the correct initial origin — no flash,
 * no hydration mismatch, and the /origin link stays crawlable.
 */
export function SelectedOriginChip({
  data,
  selectedVariantId,
}: {
  data: OriginChipData;
  /** Selected origin variant id (undefined = no variant origin picked). */
  selectedVariantId?: string;
}) {
  const active =
    (selectedVariantId ? data.byVariantId[selectedVariantId] : undefined) ?? data.defaultOption;
  if (!active) return null;

  return (
    <Link
      href={`/origin/${active.slug}`}
      title={`Origin: ${active.label}`}
      aria-label={`View all ${active.label} origin products`}
      className="inline-flex items-center gap-1.5 rounded-full border border-violet-glow/40 bg-foreground/[0.03] px-2.5 py-1 text-[0.72rem] font-medium tracking-wide text-violet-soft transition-colors hover:border-violet-glow/70"
    >
      <span aria-hidden="true" className="text-[0.8rem] leading-none">
        {active.flag}
      </span>
      {active.label}
    </Link>
  );
}
