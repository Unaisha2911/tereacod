"use client";

import { Link } from "@/components/shared/shop-link";
import { Banknote, MapPinned, ShieldAlert, ShieldCheck, Timer, Truck, type LucideIcon } from "lucide-react";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { SectionContainer } from "@/components/layout/page-container";
import { USP_FREE_DELIVERY, USP_ONE_HOUR_DELIVERY } from "@/lib/usp";

const SAFETY_LINKS = [
  { label: "Safety", href: "/safety" },
  { label: "Compliance", href: "/compliance" },
  { label: "Consumer information", href: "/legal/consumer-information" },
];

const ORDERING_POINTS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Truck, label: USP_FREE_DELIVERY },
  { icon: Timer, label: USP_ONE_HOUR_DELIVERY },
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
    <SectionContainer spacing="default" className="border-y border-line bg-muted/60">
      <section aria-labelledby="safety-heading">
        <RevealSection>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-card p-8 shadow-[0_8px_30px_-18px_rgba(23,68,105,0.22)] sm:p-10">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-warning/30" />
            <div className="flex items-start gap-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-warning/30 bg-warning/10 text-warning">
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
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2.5 text-[0.8rem] font-medium text-foreground"
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
                  className="rounded-full border border-border bg-muted/50 px-5 py-2.5 text-sm font-medium text-foreground transition-[border-color,background-color] hover:border-violet-glow/45 hover:bg-accent/80"
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
