import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand mark — TereaCOD delivery monogram + wordmark.
 * Pure SVG + type; no image dependency.
 *
 * The mark: a neon diamond framing a bold T (TEREA), with a speed bolt
 * for the cash/card-on-delivery promise. The wordmark splits the brand
 * name so a trailing "COD" lands in a gradient pill.
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
        <defs>
          <linearGradient id="tc-logo-grad" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a78bfa" />
            <stop offset="0.55" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#6fd6f2" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="62" height="62" rx="14" fill="#0B0714" />
        <rect
          x="1.75"
          y="1.75"
          width="60.5"
          height="60.5"
          rx="13.25"
          stroke="url(#tc-logo-grad)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
        <path
          d="M32 9 L55 32 L32 55 L9 32 Z"
          stroke="url(#tc-logo-grad)"
          strokeWidth="2.2"
          fill="rgba(139,92,246,0.07)"
          className="transition-[fill] duration-500 group-hover:fill-[rgba(139,92,246,0.2)]"
        />
        <path d="M22.5 24.5 H41.5 V29.5 H34.5 V43.5 H29.5 V29.5 H22.5 Z" fill="#F4F2FF" />
        <path d="M50.5 6 L44.5 14 H48 L45 20 L52.5 11.5 H48.5 L50.5 6 Z" fill="#6fd6f2" />
      </svg>
      {!compact && (
        <span className="font-display text-[1.05rem] font-bold uppercase tracking-[0.28em] text-foreground">
          {stem}
          {cod ? (
            <span className="ml-1.5 inline-flex translate-y-[-1px] items-center rounded-md bg-gradient-to-r from-[#8b5cf6] to-[#6fd6f2] px-1.5 py-0.5 text-[0.6rem] font-bold leading-none tracking-[0.14em] text-[#0B0714] shadow-[0_0_12px_rgba(139,92,246,0.45)]">
              {cod}
            </span>
          ) : null}
        </span>
      )}
    </Link>
  );
}
