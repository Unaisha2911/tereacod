"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealViewport, transitions, variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * RevealSection — scroll-triggered entrance for content blocks.
 * Reduced motion: opacity-only, no transform.
 */
export function RevealSection({
  children,
  className,
  delay = 0,
  variant = "fadeUp",
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: keyof typeof variants;
  as?: "div" | "section" | "article" | "li";
}) {
  const reduced = useReducedMotion();
  const v = reduced ? variants.fade : variants[variant];

  const Comp = as === "section" ? motion.section : as === "article" ? motion.article : as === "li" ? motion.li : motion.div;

  return (
    <Comp
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      variants={v}
      transition={delay ? { ...transitions.smooth, delay: reduced ? 0 : delay } : undefined}
      className={cn(className)}
    >
      {children}
    </Comp>
  );
}
