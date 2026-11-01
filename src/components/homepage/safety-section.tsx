"use client";

import Link from "next/link";
import { Banknote, MapPinned, ShieldAlert, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { SectionContainer } from "@/components/layout/page-container";

const SAFETY_LINKS = [
  { label: "Safety", href: "/safety" },
  { label: "Compliance", href: "/compliance" },
  { label: "Consumer information", href: "/legal/consumer-information" },
];

const ORDERING_POINTS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Truck, label: "Free delivery at AED 200 or more" },
  { icon: ShieldCheck, label: "18+ age-verified delivery" },
  { icon: Banknote, label: "Cash & card on delivery" },
  { icon: MapPinned, label: "UAE-wide" },
];

/**
 * SafetySection — compliance band kept deliberately calm and highly
 * readable: no smoke overlay, elevated card on a muted full-width band.
 * Carries the mandatory nicotine warning plus a compact ordering-info
 * strip so adults know how the storefront buys.
 */
export function SafetySection() {
  return (
    <SectionContainer spacing="default" className="border-y border-border bg-abyss/50">
      <section aria-labelledby="safety-heading">
        <RevealSection>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-elevated/50 p-8 sm:p-10">
            {/* Calm LED top rail — electric accent without stealing focus */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px opacity-70"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(251,191,36,0.65) 30%, rgba(139,92,246,0.6) 60%, transparent)",
                boxShadow: "0 0 12px rgba(251,191,36,0.3)",
              }}
            />
            <div className="flex items-start gap-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-warning/30 bg-warning/10 text-warning shadow-[0_0_16px_rgba(251,191,36,0.2)]">
                <ShieldAlert className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="safety-heading" className="text-h2-neon font-neon font-bold uppercase text-foreground">
                  Restricted by design
                </h2>
                <div className="mt-4 max-w-2xl space-y-2 text-legal text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">
                      Nicotine is an addictive chemical.
                    </span>{" "}
                    Not for sale to persons under 18 in the UAE.
                  </p>
                  <p>
                    Every order ships with courier age verification — a valid Emirates ID is checked at the door before
                    handover.
                  </p>
                </div>
              </div>
            </div>

            {/* Ordering info strip */}
            <ul
              aria-label="Ordering information"
              className="mt-7 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap"
            >
              {ORDERING_POINTS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-foreground/[0.04] px-4 py-2.5 text-[0.8rem] font-medium text-foreground"
                >
                  <Icon className="size-4 shrink-0 text-ice" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              {SAFETY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-border bg-foreground/[0.04] px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-violet-glow/45 hover:bg-foreground/[0.08] hover:shadow-[0_0_16px_rgba(139,92,246,0.28)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </RevealSection>
      </section>
    </SectionContainer>
  );
}
