"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { NeonDivider } from "./neon-divider";
import { NeonHeading } from "./neon-heading";
import { SectionContainer } from "@/components/layout/page-container";

/**
 * BrandIntroSection — editorial two-column TereaCOD story (the
 * "why us" band). Opens with an LED divider that transitions out
 * of the section above; the fixed page-level ambient smoke (app
 * shell) drifts behind the copy — this section ships NO per-section
 * smoke layer so the homepage stays light.
 * The image slot is wrapped in an intentional gradient frame so a
 * missing /brand/craft.webp still reads as a designed placeholder.
 */
export function BrandIntroSection() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <SectionContainer spacing="lg">
      {/* Section transition: LED divider with charging indicator dots */}
      <NeonDivider className="absolute inset-x-6 top-0 z-[1] sm:inset-x-10" />

      <section id="the-brand" aria-labelledby="brand-intro-heading" className="relative z-10 scroll-mt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <RevealSection>
            <NeonHeading
              id="brand-intro-heading"
              eyebrow="Why TereaCOD"
              title="Ordered today."
              accent="At your door."
            />
            <p className="mt-6 text-[0.95rem] leading-relaxed text-muted-foreground">
              TereaCOD runs on a simple promise: place your order and it
              leaves our Dubai warehouse the same day. Authentic sticks,
              honest AED pricing — no grey imports and no
              surprises at the door.
            </p>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground">
              Every unit is checked before it ships, every listing carries the
              paperwork behind it, and our team is one WhatsApp message away
              whenever you need a hand choosing.
            </p>
            <Link
              href="/about"
              className="group mt-8 inline-flex items-center gap-1.5 rounded-full border border-violet-glow/40 px-5 py-2.5 text-sm font-medium text-violet-soft shadow-[0_0_14px_rgba(139,92,246,0.18)] transition-[border-color,color,box-shadow] hover:border-violet-glow/70 hover:text-foreground hover:shadow-[0_0_22px_rgba(139,92,246,0.4)]"
            >
              About TereaCOD
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </RevealSection>

          <RevealSection variant="imageReveal" delay={0.1}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-violet-glow/25 bg-gradient-to-br from-violet-glow/15 via-elevated to-ice/10 shadow-[0_0_30px_rgba(139,92,246,0.16)]">
              {!imgFailed ? (
                <>
                  <Image
                    src="/brand/craft.webp"
                    alt="TereaCOD orders packed and dispatched from the Dubai warehouse, lit by neon"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    onError={() => setImgFailed(true)}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0c0912]/70 to-transparent"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <span className="size-3 rotate-45 border border-violet-soft/60" aria-hidden="true" />
                  <span className="text-meta uppercase tracking-[0.24em] text-muted-foreground">
                    TereaCOD photography — coming soon
                  </span>
                </div>
              )}
            </div>
          </RevealSection>
        </div>
      </section>
    </SectionContainer>
  );
}
