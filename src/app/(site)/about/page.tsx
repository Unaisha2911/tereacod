import type { Metadata } from "next";
import { FileCheck2 } from "lucide-react";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { SectionAtmosphere } from "@/components/atmosphere/section-atmosphere";
import { PageContainer, SectionContainer } from "@/components/layout/page-container";
import { PageHeading } from "@/components/layout/page-heading";
import { StatusBadge } from "@/components/shared/status-badge";
import { getSettings, getProducts } from "@/server/data";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Our Story — About the UAE's TEREA Delivery Specialist",
  description:
    "TereaCOD is the UAE's TEREA delivery specialist: authentic IQOS TEREA heated tobacco sticks curated, authenticity-checked and delivered UAE-wide from Dubai. Cash or card on delivery, transparent AED pricing, WhatsApp ordering and age-verified delivery — buy TEREA online in the UAE with confidence.",
  ...canonical("/about"),
};

const TIMELINE: Array<{ year: string; title: string; body: string }> = [
  {
    year: "2021",
    title: "Trading from Dubai",
    body: "TereaCOD Trading L.L.C. is registered in Dubai with a simple mandate: stock the TEREA sticks and heated-tobacco lines the UAE actually asks for, and stand behind every box we sell.",
  },
  {
    year: "2022",
    title: "The brand wall comes together",
    body: "The catalog sharpens into a single focused line — IQOS ILUMA heat-not-burn tobacco sticks across the multi-origin, Indonesia and Japan flavour families — kept in stock at our Dubai warehouse.",
  },
  {
    year: "2023",
    title: "Authenticity & compliance programme",
    body: "Sourcing is formalised: every batch is verified against brand security features before listing, and every handover is age-checked with a valid Emirates ID at the door.",
  },
  {
    year: "2025",
    title: "TereaCOD online",
    body: "The shop goes live. Browse the wall, order through the cart or WhatsApp, and receive your products anywhere in the Emirates in two to four business days.",
  },
];

export default async function AboutPage() {
  const [settings, products] = await Promise.all([getSettings(), getProducts()]);

  const STATS: Array<{ value: string; label: string }> = [
    { value: "2021", label: "Trading from Dubai since" },
    { value: "100%", label: "Authenticity-checked stock" },
    { value: String(products.length), label: "Products listed" },
    { value: "UAE-wide", label: "Delivery coverage" },
  ];

  const CREDENTIALS: Array<{ title: string; body: string }> = [
    {
      title: "Trade licence — Dubai DED",
      body: `${settings.brandLegalName} is registered with the Dubai Department of Economy and Tourism. Licence number, registered activities and a registry extract are shared on request.`,
    },
    {
      title: "Authenticity checks on every brand",
      body: "Every carton we stock is sourced through vetted official channels and checked against each brand's security features — scratch panels, QR codes and packaging marks — before it reaches the shelf. If a listing is on TereaCOD, it is genuine.",
    },
    {
      title: "Compliance & age verification records",
      body: "Nicotine sales in the UAE are 18+ by law. Every delivery is handed over only after a valid Emirates ID check at the door, and our listings carry the warnings and marking expected for the category.",
    },
  ];

  return (
    <PageContainer width="default" className="pb-16 sm:pb-24">
      <section className="relative">
        <SectionAtmosphere variant="violet" intensity={0.4} />
        <div className="relative z-10">
          <PageHeading
            eyebrow="Company"
            title="The UAE's TEREA delivery specialist"
            lead={`${settings.brandLegalName} curates the UAE's most-wanted TEREA sticks and IQOS ILUMA lines from our Dubai warehouse — authenticity-checked stock, transparent AED pricing, and UAE-wide delivery with cash or card on delivery.`}
          />
        </div>
      </section>

      {/* Who we are */}
      <SectionContainer spacing="sm" className="pt-4 sm:pt-6">
        <RevealSection className="max-w-prose space-y-4">
          <h2 className="sr-only">Who we are</h2>
          <p className="leading-relaxed text-foreground/90">
            TereaCOD is operated by {settings.brandLegalName}, a Dubai-registered trading company founded in 2021.
            We don&apos;t manufacture what we stock — we curate it. Heat-not-burn tobacco sticks
            made for IQOS ILUMA, from smooth toasted tobaccos to cooling menthols and click-capsule
            Pearl editions, stocked under one neon-lit roof.
          </p>
          <p className="leading-relaxed text-foreground/90">
            Every listing in this shop is authenticity-checked against the brand&apos;s own security features
            before it goes on the wall. Prices are transparent in AED, ordering works through the cart or straight on
            WhatsApp, and delivery runs UAE-wide with an Emirates ID age check at the door. What we cannot verify, we
            do not sell.
          </p>
        </RevealSection>
      </SectionContainer>

      {/* Stats band */}
      <SectionContainer spacing="sm">
        <RevealSection>
          <h2 className="sr-only">TereaCOD at a glance</h2>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
                <dt className="order-2 mt-2 text-meta uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</dt>
                <dd className="order-1 font-display text-h2 font-bold tracking-tight text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </RevealSection>
      </SectionContainer>

      {/* What we publish */}
      <SectionContainer spacing="sm">
        <RevealSection className="max-w-prose">
          <h2 className="font-display text-h3 font-semibold text-foreground">What we publish</h2>
          <p className="mt-2 text-legal text-muted-foreground">
            Credentials we hold on file and will share with partners, regulators and customers on request.
          </p>
        </RevealSection>
        <ul className="mt-6 space-y-4">
          {CREDENTIALS.map((item, i) => (
            <RevealSection as="li" key={item.title} delay={i * 0.06}>
              <div className="flex items-start gap-4 rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
                <span
                  className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-foreground/[0.04] text-violet-soft"
                  aria-hidden="true"
                >
                  <FileCheck2 className="size-[1.1rem]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-[1.02rem] font-semibold text-foreground">{item.title}</h3>
                    <StatusBadge tone="neutral">On request</StatusBadge>
                  </div>
                  <p className="mt-2 max-w-prose text-legal leading-relaxed text-foreground/85">{item.body}</p>
                </div>
              </div>
            </RevealSection>
          ))}
        </ul>
      </SectionContainer>

      {/* Timeline */}
      <SectionContainer spacing="sm">
        <RevealSection className="max-w-prose">
          <h2 className="font-display text-h3 font-semibold text-foreground">How we got here</h2>
        </RevealSection>
        <ol className="relative mt-8 max-w-prose space-y-10 before:absolute before:inset-y-2 before:left-[7px] before:w-px before:bg-foreground/10">
          {TIMELINE.map((entry, i) => (
            <RevealSection as="li" key={entry.year} delay={i * 0.05} className="relative pl-10">
              <span
                className="absolute left-0 top-1 flex size-[15px] items-center justify-center rounded-full border border-violet-glow/50 bg-background"
                aria-hidden="true"
              >
                <span className="size-1.5 rounded-full bg-violet-glow" />
              </span>
              <p className="font-mono text-meta uppercase tracking-[0.16em] text-violet-soft">
                <time dateTime={entry.year}>{entry.year}</time>
              </p>
              <h3 className="mt-1 font-display text-[1.05rem] font-semibold text-foreground">{entry.title}</h3>
              <p className="mt-1.5 text-legal leading-relaxed text-foreground/85">{entry.body}</p>
            </RevealSection>
          ))}
        </ol>
      </SectionContainer>
    </PageContainer>
  );
}
