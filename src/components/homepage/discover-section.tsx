"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Compass,
  FileCheck2,
  LifeBuoy,
  Mail,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { NeonHeading } from "./neon-heading";
import { SectionAtmosphere } from "@/components/atmosphere/section-atmosphere";
import { SectionContainer } from "@/components/layout/page-container";
import { ContentCard } from "@/components/shared/content-card";

type DiscoverEntry = {
  title: string;
  body: string;
  href: string;
  icon: LucideIcon;
};

/** Configurable wayfinding entries for the homepage discover grid. */
const HOME_DISCOVER_ITEMS: DiscoverEntry[] = [
  { title: "Shop all sticks", body: "The full heat-not-burn range across every origin line.", href: "/discover", icon: Compass },
  { title: "All brands", body: "Explore the brands we stock.", href: "/brand", icon: Sparkles },
  { title: "Safety & warnings", body: "Nicotine guidance, battery care and responsible use.", href: "/safety", icon: ShieldAlert },
  { title: "Compliance centre", body: "Conformity records and notification identifiers.", href: "/compliance", icon: FileCheck2 },
  { title: "Help & support", body: "Delivery windows, order help and device care.", href: "/help", icon: LifeBuoy },
  { title: "Contact", body: "Talk to the Dubai team — hours and direct lines.", href: "/contact", icon: Mail },
];

/**
 * DiscoverSection — hub of informational destinations, rendered from
 * the HOME_DISCOVER_ITEMS array so content stays configurable. Heads
 * with the neon discover band.
 */
export function DiscoverSection() {
  return (
    <SectionContainer spacing="lg">
      <SectionAtmosphere variant="mixed" intensity={0.45} />
      <section aria-labelledby="discover-heading" className="relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <NeonHeading
            id="discover-heading"
            eyebrow="Discover"
            title="Explore"
            accent="further"
            iceAccent
          />
          {/* Same pill CTA recipe as the other homepage section headers. */}
          <Link
            href="/discover"
            className="group inline-flex items-center gap-2 rounded-full border border-line-strong bg-foreground/[0.03] px-5 py-2.5 text-sm font-medium text-foreground shadow-[0_0_12px_rgba(139,92,246,0.12)] transition-all hover:border-violet-glow/55 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]"
          >
            View all
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {HOME_DISCOVER_ITEMS.map((entry, index) => (
            <ContentCard
              key={entry.href}
              title={entry.title}
              body={entry.body}
              href={entry.href}
              icon={entry.icon}
              index={index}
            />
          ))}
        </div>
      </section>
    </SectionContainer>
  );
}
