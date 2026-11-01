"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { revealViewport, staggerContainer, staggerItem } from "@/lib/motion";
import { SectionContainer } from "@/components/layout/page-container";
import type { Brand } from "@/types";

/** LED text channel per brand accent tint. */
const BRAND_ACCENT_TEXT: Record<Brand["accent"], string> = {
  violet: "text-violet-soft",
  ice: "text-ice",
  magenta: "text-magenta-glow",
};

/**
 * BrandCollectionSection — THE BRAND WALL, the storefront centerpiece.
 * A full-width LED-framed panel: vapor-lit shop copy on the left
 * and a responsive mini-grid of every stocked brand on the right,
 * each tile linking to its /brand/<slug> landing page with a live
 * product count computed on the server.
 *
 * Performance: the section only ever needed per-brand counts — it now
 * receives a small Record<brandName, count> instead of the FULL catalog
 * array, which used to serialize every product (descriptions, specs,
 * variants) into the client payload just to be counted here.
 */
export function BrandCollectionSection({ BRANDS, ITEM_COUNTS }: { BRANDS: Brand[]; ITEM_COUNTS: Record<string, number> }) {
  const reduced = useReducedMotion();
  const item = reduced ? undefined : staggerItem;

  // Every brand on the wall with its live product count from the catalog.
  const BRAND_WALL = BRANDS.map((brand) => ({
    brand,
    count: ITEM_COUNTS[brand.name] ?? 0,
  }));

  return (
    <SectionContainer spacing="lg">
      <section aria-labelledby="brand-collection-heading">
        <RevealSection>
          <div className="neon-edge relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-elevated/70 via-abyss/80 to-abyss/95">
            {/* Vapor wash + LED top rail — hot red channel included */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(48% 60% at 12% 8%, rgba(139,92,246,0.18), transparent 66%)," +
                  "radial-gradient(36% 44% at 74% 16%, rgba(255,42,84,0.1), transparent 68%)," +
                  "radial-gradient(40% 52% at 92% 90%, rgba(111,214,242,0.12), transparent 68%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(139,92,246,0.8) 24%, rgba(111,214,242,0.9) 44%, rgba(255,42,84,0.75) 62%, rgba(215,95,212,0.7) 80%, transparent)",
                boxShadow:
                  "0 0 16px rgba(139,92,246,0.55), 0 0 36px rgba(111,214,242,0.28), 0 0 52px rgba(255,42,84,0.18)",
              }}
            />

            <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-2 lg:items-center lg:gap-14 lg:p-14">
              {/* Copy */}
              <motion.div
                variants={reduced ? undefined : staggerContainer(0.09)}
                initial={reduced ? undefined : "hidden"}
                whileInView="visible"
                viewport={revealViewport}
              >
                <motion.p
                  variants={item}
                  className="flex items-center gap-3 text-label font-medium uppercase tracking-[0.24em] text-violet-soft"
                >
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full bg-violet-soft text-violet-soft ${reduced ? "" : "anim-led"}`}
                    style={{ ["--dur" as string]: "2.4s" }}
                  />
                  The brand wall
                </motion.p>

                <motion.h2
                  variants={item}
                  id="brand-collection-heading"
                  className="mt-4 text-h2-neon font-neon font-bold uppercase"
                >
                  <span className="text-neon">Authentic TEREA.</span>{" "}
                  <span
                    className={`text-neon-outline-ice ${reduced ? "" : "anim-flicker"}`}
                    style={{ ["--dur" as string]: "12s", ["--delay" as string]: "3s" }}
                  >
                    One shop.
                  </span>
                </motion.h2>

                <motion.p variants={item} className="mt-5 max-w-lg text-[0.95rem] leading-relaxed text-muted-foreground">
                  The TEREA sticks UAE adults reach for — IQOS ILUMA
                  heat-not-burn tobacco sticks stocked in one
                  place, authenticated unit by unit and priced in AED.
                </motion.p>

                <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
                  <Link
                    href="/brand"
                    className="neon-glow-btn hover:neon-glow-btn-hover inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-transform hover:-translate-y-0.5"
                  >
                    All brands
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/collections"
                    className="rounded-full border border-line-strong bg-foreground/[0.03] px-6 py-3 text-sm font-medium uppercase tracking-[0.08em] text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.08]"
                  >
                    Shop collections
                  </Link>
                </motion.div>
              </motion.div>

              {/* The brand wall — one tile per stocked brand, live catalog counts */}
              <RevealSection delay={0.08}>
                <ul
                  aria-label="TEREA lines stocked at TereaCOD"
                  className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
                >
                  {BRAND_WALL.map(({ brand, count }) => (
                    <li key={brand.slug}>
                      <Link
                        href={`/brand/${brand.slug}`}
                        aria-label={`${brand.name} — ${count} ${count === 1 ? "product" : "products"} listed`}
                        className="block rounded-xl border border-line bg-foreground/[0.03] px-3 py-2.5 transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/60"
                      >
                        <span
                          className={`block font-neon text-[0.72rem] font-bold uppercase leading-snug ${BRAND_ACCENT_TEXT[brand.accent]}`}
                        >
                          {brand.name}
                        </span>
                        <span className="mt-0.5 block text-[0.68rem] text-muted-foreground">
                          {count} {count === 1 ? "product" : "products"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </RevealSection>
            </div>
          </div>
        </RevealSection>
      </section>
    </SectionContainer>
  );
}
