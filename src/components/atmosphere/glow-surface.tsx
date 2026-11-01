"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * GlowSurface — interactive card shell with a pointer-tracked glow.
 * Updates two CSS custom properties directly (no React state), so
 * hover costs nothing beyond a repaint.
 */
export function GlowSurface({
  children,
  className,
  glowColor = "139, 92, 246",
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  as?: "div" | "article" | "li" | "section";
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement | null>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || typeof window === "undefined" || !window.matchMedia("(hover: hover)").matches) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref as never}
      onPointerMove={onMove}
      className={cn("group/glow relative overflow-hidden", className)}
      {...rest}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/glow:opacity-100"
        style={{
          background: `radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(${glowColor},0.13), transparent 65%)`,
        }}
      />
      {children}
    </Comp>
  );
}
