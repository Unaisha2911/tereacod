"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { NeonHeading } from "./neon-heading";
import { SectionContainer } from "@/components/layout/page-container";
import { revealViewport, staggerContainer, staggerItem } from "@/lib/motion";

type CompanyStat = { value: string; label: string; compact?: boolean };

const COMPANY_STATS: CompanyStat[] = [
  { value: "2021", label: "Trading from Dubai since" },
  { value: "100%", label: "Authenticity-checked stock" },
  { value: "AED", label: "Transparent local pricing", compact: true },
  { value: "UAE-wide", label: "Delivery coverage", compact: true },
];

/**
 * CompanySection — company facts and authenticity posture.
 * Left: staggered stat figures; right: company copy and credential list.
 */
type Credential = { label: string; note?: string };

const COMPANY_CREDENTIALS: Credential[] = [
  { label: "Trade licence · Dubai DED", note: "Details on request" },
  { label: "Batch testing documentation per liquid" },
  { label: "TPD-style notification identifiers on packs" },
];

export function CompanySection() {
  const reduced = useReducedMotion();

  return (
    <SectionContainer spacing="lg">
      <section aria-labelledby="company-heading">
        <RevealSection className="max-w-2xl">
          <NeonHeading
            id="company-heading"
            eyebrow="Company"
            title="Curated stock."
            accent="Full paper trail."
          />
        </RevealSection>

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.ul
            variants={reduced ? undefined : staggerContainer(0.09)}
            initial={reduced ? undefined : "hidden"}
            whileInView="visible"
            viewport={revealViewport}
            className="grid grid-cols-2 content-start gap-x-6 gap-y-10"
          >
            {COMPANY_STATS.map((stat) => (
              <motion.li key={stat.label} variants={reduced ? undefined : staggerItem}>
                <p
                  className={`text-gradient-violet font-neon font-bold ${
                    stat.compact ? "text-2xl sm:text-3xl" : "text-4xl"
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-2 text-sm leading-snug text-muted-foreground">{stat.label}</p>
              </motion.li>
            ))}
          </motion.ul>

          <RevealSection delay={0.1}>
            <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
              TereaCOD Trading L.L.C. operates from Downtown Dubai as the
              UAE's home for premium vaping. What we list is what we stock —
              sourced through authorised channels, checked unit by unit and
              priced transparently in AED, with the documentation published
              before the marketing.
            </p>

            <ul className="mt-8 space-y-3">
              {COMPANY_CREDENTIALS.map((credential) => (
                <li key={credential.label} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {credential.label}
                    {credential.note && (
                      <>
                        {" "}— <span className="text-foreground/80">&quot;{credential.note}&quot;</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </RevealSection>
        </div>
      </section>
    </SectionContainer>
  );
}
