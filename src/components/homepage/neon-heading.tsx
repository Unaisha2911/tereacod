"use client";

import { cn } from "@/lib/utils";

type HeadingTone = "violet" | "ice" | "red" | "mix";

const TONE_DOT: Record<HeadingTone, string> = {
  violet: "bg-violet-soft",
  ice: "bg-ice",
  red: "bg-led-red",
  mix: "bg-magenta-glow",
};

const TONE_ACCENT: Record<"violet" | "ice" | "red", string> = {
  violet: "text-violet-soft",
  ice: "text-ice",
  red: "text-led-red",
};

/**
 * SectionHeading — the standard major-heading treatment for the homepage
 * (formerly the neon sign; the glow layer has been retired in favour of a
 * clean, flat editorial look). Orbitron display face + eyebrow row:
 * a solid indicator dot, the label, and a quiet hairline.
 *
 * `title` renders solid in the foreground colour; `accent` (optional
 * trailing word/phrase) renders in the tone's flat accent colour.
 * Tone props are retained so every call site keeps compiling unchanged.
 */
export function NeonHeading({
  eyebrow,
  title,
  accent,
  id,
  align = "left",
  iceAccent = false,
  redAccent = false,
  tone = "violet",
  className,
}: {
  eyebrow: string;
  title: string;
  /** Trailing word rendered in the tone's accent colour. */
  accent?: string;
  id?: string;
  align?: "left" | "center";
  /** Use the ice accent for the trailing word instead of violet. */
  iceAccent?: boolean;
  /** Use the red accent for the trailing word (wins over iceAccent). */
  redAccent?: boolean;
  /** Accent channel of the eyebrow dot: violet (default), ice, red or mix. */
  tone?: HeadingTone;
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "flex flex-col items-center text-center", className)}>
      <p
        className={cn(
          "flex items-center gap-3 text-label font-medium uppercase tracking-[0.22em] text-violet-soft",
          align === "center" && "justify-center"
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])}
        />
        {eyebrow}
        <span
          aria-hidden="true"
          className="hidden h-px w-16 bg-line sm:block"
        />
      </p>
      <h2 id={id} className="mt-4 text-h2-neon font-neon font-bold uppercase text-foreground">
        {title}
        {accent && (
          <span
            className={cn(
              "ml-[0.28em] inline-block",
              redAccent ? TONE_ACCENT.red : iceAccent ? TONE_ACCENT.ice : TONE_ACCENT.violet
            )}
          >
            {accent}
          </span>
        )}
      </h2>
    </div>
  );
}
