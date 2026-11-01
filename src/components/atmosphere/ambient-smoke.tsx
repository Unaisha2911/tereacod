"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";
import { ATMOSPHERE_PRESETS, type AtmospherePreset } from "@/lib/atmosphere";
import { MotionBoundary, useMotionBoundary } from "./motion-boundary";
import { SmokeTexture } from "./smoke-texture";

interface AmbientSmokeProps {
  /** Positioning context of the host: absolute fills the nearest relative parent. */
  preset?: AtmospherePreset;
  palette?: "violet" | "ice" | "magenta" | "mixed" | "inferno";
  /** Enable subtle desktop pointer parallax. */
  interactive?: boolean;
  /** Render behind or above content. */
  zIndexClass?: string;
  /** Positioning: "absolute" (default) or "fixed" (page-level backdrop). */
  position?: "absolute" | "fixed";
  className?: string;
  /** Override opacity multiplier (0..1). */
  intensity?: number;
}

const PALETTES: Record<NonNullable<AmbientSmokeProps["palette"]>, (c: string) => string> = {
  violet: (c) => (c.toLowerCase().includes("6fd6f2") ? "#8b5cf6" : c),
  ice: (c) => (c.toLowerCase().includes("8b5cf6") || c.toLowerCase().includes("d75fd4") ? "#6fd6f2" : c),
  magenta: (c) => (c.toLowerCase().includes("8b5cf6") ? "#d75fd4" : c.toLowerCase().includes("6fd6f2") ? "#a78bfa" : c),
  mixed: (c) => c,
  // Inferno — violet & ice remapped to hot reds; magenta stays as the blend channel.
  inferno: (c) => {
    const s = c.toLowerCase();
    if (s.includes("6fd6f2")) return "#ff5c74";
    if (s.includes("8b5cf6")) return "#ff2a54";
    return c;
  },
};

function SmokeInner({ palette, interactive, zIndexClass = "-z-10", intensity, position = "absolute" }: Omit<AmbientSmokeProps, "preset">) {
  const { preset, visible, reducedMotion } = useMotionBoundary();
  const config = ATMOSPHERE_PRESETS[preset];
  const hostRef = useRef<HTMLDivElement>(null);

  // Pointer parallax — motion values only, zero re-renders. Desktop, fine pointers, non-reduced.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 42, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 42, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (!interactive || reducedMotion || config.parallax === 0) return;
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetX = nx * config.parallax;
      targetY = ny * config.parallax * 0.6;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          px.set(targetX);
          py.set(targetY);
          raf = 0;
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [interactive, reducedMotion, config.parallax, px, py]);

  // Apply spring to host via effect (avoids re-render churn).
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const unsX = sx.on("change", (v) => {
      el.style.setProperty("--par-x", `${v.toFixed(2)}px`);
    });
    const unsY = sy.on("change", (v) => {
      el.style.setProperty("--par-y", `${v.toFixed(2)}px`);
    });
    el.style.transform = "translate3d(var(--par-x, 0), var(--par-y, 0), 0)";
    return () => {
      unsX();
      unsY();
    };
  }, [sx, sy]);

  const mult = (intensity ?? 1) * config.intensity;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none ${position} inset-0 overflow-hidden ${zIndexClass}`}
      style={{ opacity: visible ? 1 : 0.4, transition: "opacity 600ms ease" }}
    >
      {/* Keyed photographic smoke textures — real vapor detail, tinted to
          the active palette. No blur filters: each layer is a single
          pre-softened composited texture moved by transform/opacity only,
          which keeps scrolling smooth. */}
      {config.layers.map((layer, i) => (
        <SmokeTexture
          key={i}
          asset={layer.asset}
          color={PALETTES[palette ?? "mixed"](layer.color)}
          drift={layer.drift}
          duration={layer.duration}
          delay={layer.delay}
          opacity={layer.opacity * mult}
          width={layer.width}
          x={layer.x}
          y={layer.y}
          flipX={layer.flipX}
          flipY={layer.flipY}
        />
      ))}
    </div>
  );
}

/**
 * AmbientSmoke — the site's signature atmosphere.
 *
 * Usage: place inside a `relative` container (or `fixed` wrapper for
 * page-level backdrop). Never intercepts pointer events; fails safe.
 */
export function AmbientSmoke(props: AmbientSmokeProps) {
  return (
    <MotionBoundary preset={props.preset} alwaysVisible className="contents">
      <SmokeInner {...props} />
    </MotionBoundary>
  );
}
