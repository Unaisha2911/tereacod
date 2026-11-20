"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * SmokeSignature — the hero feature-area centrepiece.
 *
 * Original composition designed for the TereaCOD light brand (NOT imported):
 * layered sky-blue arcs — blurred, then warped by an animated SVG
 * feTurbulence + feDisplacementMap — drift as smoke around a soft haze
 * core, with two slow ember accents. The same displacement technique the
 * reference pen popularises, rebuilt from scratch with this site's palette,
 * timing and light-surface treatment.
 *
 * Perf model:
 * - ONE turbulence filter for the whole medallion, bounded filter region,
 *   numOctaves 3 (the cheap end of fractal noise).
 * - SMIL drives the turbulence morph; ring drift is plain CSS transforms.
 * - The SMIL clock is paused whenever the medallion is offscreen, the tab
 *   is hidden, or the visitor prefers reduced motion (zero background cost).
 * - Everything is decorative: aria-hidden + no interactive descendants.
 */
export function SmokeSignature({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [inView, setInView] = useState(true);
  const [docHidden, setDocHidden] = useState(false);

  // Track on-screen state so the filter repaints only happen when seen.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(svg);
    return () => io.disconnect();
  }, []);

  // Track tab visibility — SMIL would keep morphing in background tabs.
  useEffect(() => {
    const onVis = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Single source of truth for the animation clock.
  const running = Boolean(inView && !docHidden && !reduced);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (running) svg.unpauseAnimations();
      else svg.pauseAnimations();
    } catch {
      // Older browsers without the SMIL control API: static frame is fine.
    }
  }, [running]);

  return (
    <div className={cn("relative aspect-square", className)} aria-hidden="true">
      <svg
        ref={svgRef}
        viewBox="0 0 600 600"
        data-smoke-paused={running ? undefined : "true"}
        className="size-full overflow-visible"
      >
        <defs>
          {/* Blur → turbulence-warp. Displacing the BLURRED source is what
              turns crisp rings into soft, torn smoke (the reference trick,
              retuned: fewer octaves, tighter region, brand palette). */}
          <filter
            id="tcod-smoke-warp"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="soft" />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.011"
              numOctaves="3"
              seed="7"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="26s"
                values="0.008;0.016;0.008"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="soft"
              in2="noise"
              scale="42"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Soft haze pooled in the core — static, outside the filter. */}
          <radialGradient id="tcod-smoke-haze" cx="50%" cy="46%" r="55%">
            <stop offset="0%" stopColor="#e6f2fa" stopOpacity="0.95" />
            <stop offset="52%" stopColor="#cde5f5" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#cde5f5" stopOpacity="0" />
          </radialGradient>

          {/* Ring strokes — deep sky fading to near-white along the arc so
              the smoke reads on the light canvas. */}
          <linearGradient id="tcod-ring-deep" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#8fbddd" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#c6e2f4" stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id="tcod-ring-mid" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--ice)" stopOpacity="0.42" />
            <stop offset="60%" stopColor="#a9cfe8" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#d8ebf8" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="tcod-ring-pale" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9fc9e4" stopOpacity="0.46" />
            <stop offset="100%" stopColor="#e2f1fa" stopOpacity="0.1" />
          </linearGradient>

          <filter id="tcod-smoke-blur" x="-60%" y="-160%" width="220%" height="420%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" />
          </filter>
        </defs>

        {/* Core haze + ground shadow — cheap static paint. */}
        <circle cx="300" cy="286" r="196" fill="url(#tcod-smoke-haze)" />
        <ellipse
          cx="300"
          cy="556"
          rx="168"
          ry="20"
          fill="#7aa6cb"
          opacity="0.2"
          filter="url(#tcod-smoke-blur)"
        />

        {/* Smoke field — every ring shares the single warp filter; each
            drifts on its own CSS turn (speeds/directions differ so the
            composition never reads as mechanical circles). Broken arc
            dash-arrays become torn wisps once displaced. */}
        <g filter="url(#tcod-smoke-warp)">
          <g className="smoke-spin" style={{ ["--spin" as string]: "64s" }}>
            <circle
              cx="300"
              cy="300"
              r="196"
              fill="none"
              stroke="url(#tcod-ring-deep)"
              strokeWidth="30"
              strokeLinecap="round"
              strokeDasharray="210 90 330 140 180 120"
              opacity="0.5"
            />
          </g>
          <g className="smoke-spin smoke-spin--rev" style={{ ["--spin" as string]: "48s" }}>
            <circle
              cx="300"
              cy="300"
              r="148"
              fill="none"
              stroke="url(#tcod-ring-mid)"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray="150 110 260 90"
              opacity="0.55"
            />
          </g>
          <g className="smoke-spin" style={{ ["--spin" as string]: "37s" }}>
            <circle
              cx="300"
              cy="300"
              r="104"
              fill="none"
              stroke="url(#tcod-ring-pale)"
              strokeWidth="26"
              strokeLinecap="round"
              strokeDasharray="90 70 190 60"
              opacity="0.62"
            />
          </g>
          {/* Off-axis ellipse — the wobble keeps the halo organic. */}
          <g className="smoke-spin smoke-spin--rev" style={{ ["--spin" as string]: "56s" }}>
            <ellipse
              cx="300"
              cy="300"
              rx="238"
              ry="212"
              fill="none"
              stroke="#9fc9e4"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="120 200 90 160"
              opacity="0.4"
            />
          </g>
        </g>

        {/* Ember accents — the heated-stick nod, two slow drifters. */}
        <circle
          className="smoke-ember"
          style={{ ["--drift" as string]: "7.5s" }}
          cx="404"
          cy="128"
          r="7"
          fill="var(--red)"
          opacity="0.5"
        />
        <circle
          className="smoke-ember"
          style={{ ["--drift" as string]: "9.5s", animationDelay: "-3s" }}
          cx="176"
          cy="446"
          r="5"
          fill="var(--red)"
          opacity="0.35"
        />
      </svg>
    </div>
  );
}
