import { Link } from "@/components/shared/shop-link";
import { cn } from "@/lib/utils";

/**
 * Brand mark — TereaCOD delivery monogram + wordmark.
 * Pure SVG + type; no image dependency.
 *
 * The mark: a diamond framing a bold T (TEREA), with a speed bolt for the
 * cash/card-on-delivery promise. The wordmark splits the brand name so a
 * trailing "COD" lands in a flat muted-gold pill. The former violet→cyan
 * neon gradient has been retired with the neon look.
 *
 * Rendered inside client components (header, mobile sheet, admin shell,
 * auth screens), so it stays synchronous: server callers that already
 * hold site settings pass `brandName` explicitly; everyone else gets the
 * compiled-in brand default.
 */
export function Logo({
  className,
  compact = false,
  brandName = "TereaCOD",
}: {
  className?: string;
  compact?: boolean;
  brandName?: string;
}) {
  const stem = brandName.replace(/COD$/i, "");
  const cod = brandName.slice(stem.length);

  return (
    <Link
      href="/"
      aria-label={`${brandName} — TEREA delivery, home`}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <svg width="26" height="26" viewBox="0 0 64 64" fill="none" aria-hidden="true" className="shrink-0">
        <rect x="1" y="1" width="62" height="62" rx="14" fill="#14110E" />
        <rect
          x="1.75"
          y="1.75"
          width="60.5"
          height="60.5"
          rx="13.25"
          stroke="#C9A366"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <path
          d="M32 9 L55 32 L32 55 L9 32 Z"
          stroke="#C9A366"
          strokeWidth="2.2"
          fill="rgba(201,163,102,0.08)"
          className="transition-[fill] duration-500 group-hover:fill-[rgba(201,163,102,0.2)]"
        />
        <path d="M22.5 24.5 H41.5 V29.5 H34.5 V43.5 H29.5 V29.5 H22.5 Z" fill="#F3EFE8" />
        <path d="M50.5 6 L44.5 14 H48 L45 20 L52.5 11.5 H48.5 L50.5 6 Z" fill="#9FB5AB" />
      </svg>
      {!compact && (
        <span className="font-display text-[1.05rem] font-bold uppercase tracking-[0.28em] text-foreground">
          {stem}
          {cod ? (
            <span className="ml-1.5 inline-flex translate-y-[-1px] items-center rounded-md bg-[#C9A366] px-1.5 py-0.5 text-[0.6rem] font-bold leading-none tracking-[0.14em] text-[#14110E]">
              {cod}
            </span>
          ) : null}
        </span>
      )}
    </Link>
  );
}
