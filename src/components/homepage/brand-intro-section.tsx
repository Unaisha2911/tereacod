"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/components/shared/shop-link";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { NeonHeading } from "./neon-heading";
import { SectionContainer } from "@/components/layout/page-container";

/**
 * BrandIntroSection — editorial two-column TereaCOD story (the
 * "why us" band). The former page-level ambient smoke layer has been
 * removed; this section relies on flat gradients and the colour wash
 * from the section above for atmosphere.
 * The image slot is wrapped in an intentional gradient frame so a
 * missing /brand/craft.webp still reads as a designed placeholder.
 */
export function BrandIntroSection() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <SectionContainer spacing="lg">
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
              className="group mt-8 inline-flex items-center gap-1.5 rounded-full border border-violet-glow/40 px-5 py-2.5 text-sm font-medium text-violet-soft transition-[border-color,color] hover:border-violet-glow/70 hover:text-foreground"
            >
              About TereaCOD
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </RevealSection>

          <RevealSection variant="imageReveal" delay={0.1}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-muted">
              {!imgFailed ? (
                <>
                  <Image
                    src="/brand/craft.webp"
                    alt="TereaCOD orders packed and dispatched from the Dubai warehouse"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    onError={() => setImgFailed(true)}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--bg-1)]/70 to-transparent"
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
