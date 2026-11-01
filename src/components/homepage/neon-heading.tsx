"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type HeadingTone = "violet" | "ice" | "red" | "mix";

const TONE_TITLE: Record<HeadingTone, string> = {
  violet: "text-neon",
  ice: "text-neon-ice",
  red: "text-neon-red",
  mix: "text-neon-mix",
};

/** Double-layer (two-colour concentric tube) treatment per accent tint. */
const TONE_ACCENT_DUO: Record<"violet" | "ice" | "red", string> = {
  violet: "text-neon-outline-duo",
  ice: "text-neon-outline-duo-ice",
  red: "text-neon-outline-duo-red",
};

const TONE_DOT: Record<HeadingTone, string> = {
  violet: "bg-violet-soft text-violet-soft",
  ice: "bg-ice text-ice",
  red: "bg-led-red text-led-red",
  mix: "bg-magenta-glow text-magenta-glow",
};

/**
 * NeonHeading — the standard major-heading treatment for the homepage.
 * Orbitron (Cybertruck-style techno face) + LED eyebrow: a pulsing
 * indicator dot, the label, and a conductive hairline.
 *
 * `title` renders as the lit neon sign (tone selects the LED channel —
 * "mix" lights every channel at once); `accent` (optional trailing
 * word/phrase) renders as a DOUBLE-LAYER hollow tube — a bold outer
 * stroke plus a thinner contrasting inner stroke (violet+ice,
 * ice+violet or red+magenta) for the heavy multi-colour neon look.
 * Requires data-text, which this component sets automatically.
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
  /** Trailing word rendered in outline style. */
  accent?: string;
  id?: string;
  align?: "left" | "center";
  /** Use the ice LED tint for the accent instead of violet. */
  iceAccent?: boolean;
  /** Use the red LED tint for the accent (wins over iceAccent). */
  redAccent?: boolean;
  /** LED channel of the lit title: violet (default), ice, red or mix. */
  tone?: HeadingTone;
  className?: string;
}) {
  const reduced = useReducedMotion();

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
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            TONE_DOT[tone],
            tone === "red" && "shadow-[0_0_8px_rgba(255,42,84,0.9)]",
            reduced ? "" : "anim-led"
          )}
          style={{ ["--dur" as string]: "2.6s" }}
        />
        {eyebrow}
        <span aria-hidden="true" className="neon-divider hidden w-16 opacity-60 sm:block" />
      </p>
      <h2 id={id} className="mt-4 text-h2-neon font-neon font-bold uppercase">
        <span className={TONE_TITLE[tone]}>{title}</span>
        {accent && (
          <span
            className={cn(
              "ml-[0.28em] inline-block",
              redAccent
                ? TONE_ACCENT_DUO.red
                : iceAccent
                  ? TONE_ACCENT_DUO.ice
                  : TONE_ACCENT_DUO.violet,
              !reduced && "anim-flicker"
            )}
            data-text={accent}
            style={{ ["--dur" as string]: "11s", ["--delay" as string]: "1.4s" }}
          >
            {accent}
          </span>
        )}
      </h2>
    </div>
  );
}
