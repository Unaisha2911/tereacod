import { Link } from "@/components/shared/shop-link";
import { ArrowRight } from "lucide-react";
import type { Brand } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Brand accent channels — one hex per brand accent. Kept as inline
 * styles (colour only) so Tailwind arbitrary classes stay clean.
 * Muted, non-neon values matching the retokened brand palette.
 */
export const BRAND_ACCENT_HEX: Record<Brand["accent"], string> = {
  violet: "#c9a366",
  ice: "#9fb5ab",
  magenta: "#c2939d",
};

/** Soft rgba companions used for accent borders (no glow shadows). */
export const BRAND_ACCENT_GLOW: Record<Brand["accent"], string> = {
  violet: "rgba(201, 163, 102, 0.5)",
  ice: "rgba(159, 181, 171, 0.45)",
  magenta: "rgba(194, 147, 157, 0.5)",
};

const chipClass =
  "inline-flex items-center rounded-full border border-line px-2.5 py-1 text-[0.7rem] leading-none text-muted-foreground";

/**
 * BrandCard — tile for a stocked brand in the /brand directory.
 * Accent colouring (dot, name, count chip, arrow, hover border) is
 * applied via inline styles from BRAND_ACCENT_* maps; the hover
 * accent-border is a colour-carrying overlay span faded in with
 * group-hover. All glow effects (shadows, text glows, filter glows)
 * were removed with the neon engine (formerly the neon sign tiles).
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
      {/* Accent border overlay — revealed on hover/focus */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl border opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ borderColor: accent }}
      />

      <div className="relative flex items-start gap-2.5">
        {brand.featured && (
          <span
            aria-hidden="true"
            className="mt-[0.55rem] size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
        )}
        <div className="min-w-0">
          <h3 className="font-neon text-base font-bold uppercase tracking-[0.06em] text-foreground sm:text-lg">
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
          style={{ color: accent }}
        />
      </div>
    </Link>
  );
}
