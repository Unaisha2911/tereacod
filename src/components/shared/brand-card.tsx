import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Brand } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Brand accent channels — one hex per brand accent. Kept as inline
 * styles (box-shadow / colour) so Tailwind arbitrary classes stay clean.
 */
export const BRAND_ACCENT_HEX: Record<Brand["accent"], string> = {
  violet: "#8b5cf6",
  ice: "#6fd6f2",
  magenta: "#d75fd4",
};

/** Soft glow (rgba) companions used for LED shadows and hover halos. */
export const BRAND_ACCENT_GLOW: Record<Brand["accent"], string> = {
  violet: "rgba(139, 92, 246, 0.55)",
  ice: "rgba(111, 214, 242, 0.5)",
  magenta: "rgba(215, 95, 212, 0.55)",
};

const chipClass =
  "inline-flex items-center rounded-full border border-line px-2.5 py-1 text-[0.7rem] leading-none text-muted-foreground";

/**
 * BrandCard — neon tile for a stocked brand in the /brand directory.
 * Accent colouring (LED dot, name glow, count chip, arrow) is applied via
 * inline styles from BRAND_ACCENT_* maps; the hover border-glow is a
 * colour-carrying overlay span faded in with group-hover.
 */
export function BrandCard({
  brand,
  productCount,
  className,
}: {
  brand: Brand;
  productCount: number;
  className?: string;
}) {
  const accent = BRAND_ACCENT_HEX[brand.accent];
  const glow = BRAND_ACCENT_GLOW[brand.accent];

  return (
    <Link
      href={`/brand/${brand.slug}`}
      aria-label={`${brand.name} — ${productCount} products from ${brand.origin}. Open the ${brand.name} brand page.`}
      className={cn(
        "group relative flex min-h-44 flex-col rounded-2xl border border-line bg-elevated/45 p-5 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet sm:p-6",
        className
      )}
    >
      {/* Accent border-glow overlay — revealed on hover/focus */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl border opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ borderColor: accent, boxShadow: `0 0 34px -10px ${glow}, inset 0 0 26px -16px ${glow}` }}
      />

      <div className="relative flex items-start gap-2.5">
        {brand.featured && (
          <span
            aria-hidden="true"
            className="anim-led mt-[0.55rem] size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent, boxShadow: `0 0 8px ${glow}`, ["--dur" as string]: "2.2s" }}
          />
        )}
        <div className="min-w-0">
          <h3
            className="font-neon text-base font-bold uppercase tracking-[0.06em] text-foreground sm:text-lg"
            style={{ textShadow: `0 0 16px ${glow}` }}
          >
            {brand.name}
          </h3>
          <p className="mt-1 text-[0.78rem] leading-snug text-muted-foreground">{brand.tagline}</p>
        </div>
      </div>

      <div className="relative mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={chipClass}>{brand.origin}</span>
          <span className={chipClass}>est. {brand.established}</span>
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] leading-none"
            style={{ borderColor: glow, color: accent }}
          >
            {productCount} {productCount === 1 ? "product" : "products"}
          </span>
        </div>
        <ArrowRight
          className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
          style={{ color: accent, filter: `drop-shadow(0 0 6px ${glow})` }}
        />
      </div>
    </Link>
  );
}
