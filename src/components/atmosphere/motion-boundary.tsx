"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { resolvePreset, type AtmospherePreset } from "@/lib/atmosphere";

interface MotionBoundaryContextValue {
  preset: AtmospherePreset;
  /** True while the boundary is (or may be) on screen. */
  visible: boolean;
  reducedMotion: boolean;
  /** Registered by consumers to request a preset override. */
  requested: AtmospherePreset | undefined;
}

const MotionBoundaryContext = createContext<MotionBoundaryContextValue>({
  preset: "ambient",
  visible: true,
  reducedMotion: false,
  requested: undefined,
});

interface MotionBoundaryProps {
  children: React.ReactNode;
  /** Preset hint for everything inside this boundary. */
  preset?: AtmospherePreset;
  /** Disable visibility pausing (e.g. fixed backgrounds). */
  alwaysVisible?: boolean;
  className?: string;
  as?: "div" | "section";
  "aria-hidden"?: boolean;
}

/**
 * MotionBoundary — the smoke engine's safety shell.
 *
 * - Resolves the effective preset from: explicit prop > reduced-motion > device signals.
 * - Pauses expensive effects while off-screen via IntersectionObserver.
 * - Renders children unconditionally: if any effect fails, content stays readable.
 */
export function MotionBoundary({ children, preset, alwaysVisible = false, className, as = "div" }: MotionBoundaryProps) {
  const prefersReduced = useReducedMotion();
  const [visible, setVisible] = useState(!alwaysVisible);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (alwaysVisible || !ref.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting);
      },
      { rootMargin: "12% 0px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [alwaysVisible]);

  const reducedMotion = Boolean(prefersReduced);
  const resolved = resolvePreset(preset, reducedMotion);

  const Tag = as;
  return (
    <MotionBoundaryContext.Provider value={{ preset: resolved, visible: alwaysVisible || visible, reducedMotion, requested: preset }}>
      <Tag ref={as === "div" ? ref : undefined} className={className} data-atmosphere-preset={resolved}>
        {children}
      </Tag>
    </MotionBoundaryContext.Provider>
  );
}

export function useMotionBoundary() {
  return useContext(MotionBoundaryContext);
}
