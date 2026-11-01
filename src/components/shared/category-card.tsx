"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { GlowSurface } from "@/components/atmosphere/glow-surface";
import { revealViewport } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CatalogCategory } from "@/types";

const ACCENTS = {
  violet: { glow: "139, 92, 246", ring: "hover:border-violet-glow/45", text: "text-violet-soft" },
  ice: { glow: "111, 214, 242", ring: "hover:border-ice/45", text: "text-ice" },
  magenta: { glow: "215, 95, 212", ring: "hover:border-magenta-glow/45", text: "text-magenta-glow" },
} as const;

/** CategoryCard — atmospheric tile into a catalog category. */
export function CategoryCard({ category, index = 0 }: { category: CatalogCategory; index?: number }) {
  const reduced = useReducedMotion();
  const accent = ACCENTS[category.accent] ?? ACCENTS.violet;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={revealViewport}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
    >
      <GlowSurface as="article" glowColor={accent.glow} className={cn("h-full rounded-2xl border border-line bg-elevated/45 transition-colors duration-300", accent.ring)}>
        <Link href={`/collections/${category.slug}`} className="flex h-full min-h-44 flex-col justify-between gap-6 p-5 sm:p-6" aria-label={`${category.name} — ${category.description}`}>
          <div className="flex items-start justify-between">
            <span className={cn("text-meta font-semibold uppercase tracking-[0.2em]", accent.text)}>
              {String(category.itemCount).padStart(2, "0")} items
            </span>
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full border border-line-strong text-muted-foreground transition-all duration-300 group-hover/glow:rotate-45 group-hover/glow:border-current group-hover/glow:text-foreground"
            >
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground sm:text-xl">{category.name}</h3>
            <p className="mt-1.5 text-[0.85rem] leading-relaxed text-muted-foreground">{category.description}</p>
          </div>
        </Link>
      </GlowSurface>
    </motion.div>
  );
}
