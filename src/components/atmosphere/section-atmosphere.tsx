"use client";

import { AmbientSmoke } from "./ambient-smoke";
import type { AtmospherePreset } from "@/lib/atmosphere";

/**
 * SectionAtmosphere — tuned per-section atmosphere wrapper.
 * Renders absolute smoke behind the section's content; host must be
 * `relative` with content above z-0.
 */
export function SectionAtmosphere({
  variant = "violet",
  preset = "ambient",
  intensity = 0.8,
  className = "",
}: {
  variant?: "violet" | "ice" | "magenta" | "mixed" | "inferno";
  preset?: AtmospherePreset;
  intensity?: number;
  className?: string;
}) {
  return <AmbientSmoke preset={preset} palette={variant} intensity={intensity} className={className} zIndexClass="z-0" />;
}
