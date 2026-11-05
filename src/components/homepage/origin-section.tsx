"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { NeonHeading } from "./neon-heading";
import { SectionContainer } from "@/components/layout/page-container";
import { GlowSurface } from "@/components/atmosphere/glow-surface";
import { ORIGIN_LINES } from "@/lib/catalog-origin";

/**
 * ORIGIN SECTION — "Shop by origin" grid on the homepage.
 *
 * One card per TEREA sourcing line (single source of truth:
 * src/lib/catalog-origin.ts — currently the seven active markets:
 * Uzbekistan, Tajikistan, Kyrgyzstan, Indonesia, Switzerland (Duty Free),
 * Japan and Italy). Every card links to its dedicated crawlable landing
 * page at /origin/<slug>; the same lines drive the origin filter chips on
 * every listing page and the admin product dropdown.
 */
export function OriginSection() {
  return (
    <SectionContainer spacing="lg">
      <section aria-labelledby="origin-heading" className="relative z-10">
        <RevealSection className="flex flex-wrap items-end justify-between gap-6">
          <NeonHeading
            id="origin-heading"
            eyebrow="Origin lines"
            title="Shop by"
            accent="origin"
            redAccent
          />
          <p className="max-w-sm text-[0.85rem] leading-relaxed text-muted-foreground">
            Every TEREA stick belongs to a sourcing line — pick yours to see
            delivery details, flavour guides and per-line pricing.
          </p>
        </RevealSection>

        <div className="mt-10 grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {ORIGIN_LINES.map((line, index) => (
            <OriginCard key={line.slug} slug={line.slug} flag={line.flag} label={line.label} blurb={line.cardBlurb} index={index} />
          ))}
        </div>
      </section>
    </SectionContainer>
  );
}

function OriginCard({
  slug,
  flag,
  label,
  blurb,
  index,
}: {
  slug: string;
  flag: string;
  label: string;
  blurb: string;
  index: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <GlowSurface
        as="article"
        glowColor="139, 92, 246"
        className="h-full rounded-2xl border border-line bg-elevated/45 transition-colors duration-300 hover:border-violet-glow/45"
      >
        <Link
          href={`/origin/${slug}`}
          aria-label={`TEREA ${label} origin line — shop the shelf`}
          className="flex h-full min-h-40 flex-col justify-between gap-5 p-5 sm:p-6"
        >
          <div className="flex items-start justify-between">
            <span className="text-3xl leading-none sm:text-4xl" role="img" aria-label={`${label} flag`}>
              {flag}
            </span>
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full border border-line-strong text-muted-foreground transition-[transform,border-color,color] duration-300 group-hover/glow:rotate-45 group-hover/glow:border-current group-hover/glow:text-foreground"
            >
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">{label}</h3>
            <p className="mt-1 line-clamp-2 text-[0.8rem] leading-relaxed text-muted-foreground">{blurb}</p>
          </div>
        </Link>
      </GlowSurface>
    </motion.div>
  );
}
