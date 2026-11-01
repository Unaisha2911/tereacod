import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageContainer, SectionContainer } from "@/components/layout/page-container";
import { PageHeading } from "@/components/layout/page-heading";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { SectionAtmosphere } from "@/components/atmosphere/section-atmosphere";
import { DocumentCard } from "@/components/shared/content-card";
import { InformationAccordion } from "@/components/shared/information-accordion";
import { getSettings } from "@/server/data";
import type { SiteSettings } from "@/types";

export const metadata: Metadata = {
  ...canonical("/safety"),
  title: "Safety",
  description:
    "TereaCOD safety hub — nicotine warning, safe storage, battery and charging care, device disposal, travel considerations and how to report a safety issue.",
};

const SAFETY_PANELS = (settings: SiteSettings) => [
  {
    id: "safe-storage",
    title: "Safe storage",
    content: (
      <div className="max-w-prose space-y-3">
        <p>
          Keep every product in its original child-resistant packaging, closed when not in use, and store the whole
          range out of reach and out of sight of children and pets.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-violet-soft">
          <li>Store liquids upright, tightly sealed, below 25 °C and away from sunlight.</li>
          <li>Never decant liquid into drinks bottles or any container without a child-resistant cap.</li>
          <li>Keep devices away from metal objects, direct heat and locked cars in summer temperatures.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "battery-care",
    title: "Battery & charging care",
    content: (
      <div className="max-w-prose space-y-3">
        <p>
          Devices contain lithium cells. Treat them with the same care you would give any rechargeable battery.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-violet-soft">
          <li>Charge only with the supplied cable and a reputable power source; unplug when full.</li>
          <li>Never charge unattended overnight or on soft furnishings.</li>
          <li>Stop using a device immediately if the cell is swollen, leaking, dented or overheating.</li>
          <li>Never open, puncture, crush or modify a device or its battery.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "disposal",
    title: "Device disposal",
    content: (
      <div className="max-w-prose space-y-3">
        <p>
          Vape devices and pods are electrical equipment containing lithium — they never belong in household waste.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-violet-soft">
          <li>Take depleted devices and cells to a battery collection point — most UAE supermarkets and electronics retailers provide them.</li>
          <li>Empty liquid bottles can go in general recycling where local rules allow; rinse first.</li>
          <li>Used pods should be sealed in a bag before disposal.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "reporting",
    title: "Reporting a safety issue",
    content: (
      <div className="max-w-prose space-y-3">
        <p>
          If you suspect a defect, or experience an adverse event, contact the support desk at{" "}
          {settings.contact.supportEmail} — replies within two business days, and safety reports are prioritised.
        </p>
        <p>Include as much of the following as you can:</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-violet-soft">
          <li>Batch code (printed on the carton or bottle base)</li>
          <li>Device model and, if known, the pod or coil type</li>
          <li>A description of what happened, with photos if relevant</li>
        </ul>
        <p>
          Serious reports are documented and escalated to the compliance office. The formal channel is described in
          our{" "}
          <Link href="/legal/consumer-information" className="text-violet-soft underline-offset-4 hover:underline">
            Consumer Information
          </Link>{" "}
          page.
        </p>
      </div>
    ),
  },
  {
    id: "travel",
    title: "Travel considerations",
    content: (
      <div className="max-w-prose space-y-3">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-violet-soft">
          <li>Airline rules vary by carrier — always check your airline's policy before flying.</li>
          <li>As a baseline, carry devices and liquids in cabin baggage, never in checked luggage.</li>
          <li>Keep spare batteries away from metal objects and carry them in protective cases.</li>
          <li>Vapor product rules differ by destination; confirm legality before you travel.</li>
          <li>Use is prohibited on board at all times.</li>
        </ul>
      </div>
    ),
  },
];

export default async function SafetyPage() {
  const settings = await getSettings();

  return (
    <PageContainer width="default" className="pb-16 sm:pb-24">
      <section className="relative">
        <SectionAtmosphere variant="violet" intensity={0.35} />
        <div className="relative z-10">
          <PageHeading
            eyebrow="Safety"
            title="Care, before the draw"
            lead="Storage, charging, disposal and reporting — the practical basics every adult user should know, in plain language."
          />
        </div>
      </section>

      {/* Warning banner */}
      <SectionContainer spacing="sm" className="pt-2">
        <RevealSection>
          <div
            role="note"
            aria-label="Nicotine warning"
            className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-5 sm:p-6"
          >
            <p className="flex items-center gap-2.5 font-display text-lg font-semibold text-warning">
              <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
              Nicotine is an addictive chemical.
            </p>
            <p className="mt-2.5 max-w-prose text-legal leading-relaxed text-foreground/90">
              {settings.ageRestrictionNotice} It is illegal to sell nicotine products to anyone under 18 in the
              United Arab Emirates. These products are not recommended for non-smokers.
            </p>
          </div>
        </RevealSection>
      </SectionContainer>

      {/* Read first */}
      <SectionContainer spacing="sm">
        <RevealSection className="max-w-prose">
          <h2 className="font-display text-h3 font-semibold text-foreground">Read first</h2>
          <p className="mt-2 text-legal text-muted-foreground">
            The regulated-category information and the full compliance register behind it.
          </p>
        </RevealSection>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <RevealSection delay={0.05}>
            <DocumentCard
              title="Consumer Information"
              type="web"
              href="/legal/consumer-information"
              note="Warnings, age rules, reporting"
            />
          </RevealSection>
          <RevealSection delay={0.1}>
            <DocumentCard title="Compliance centre" type="web" href="/compliance" note="Records & disclosures" />
          </RevealSection>
        </div>
      </SectionContainer>

      {/* Safety sections */}
      <SectionContainer spacing="sm">
        <RevealSection className="max-w-prose">
          <h2 className="font-display text-h3 font-semibold text-foreground">Safety in practice</h2>
        </RevealSection>
        <RevealSection className="mt-6">
          <InformationAccordion panels={SAFETY_PANELS(settings)} defaultOpen="safe-storage" />
        </RevealSection>
      </SectionContainer>
    </PageContainer>
  );
}
