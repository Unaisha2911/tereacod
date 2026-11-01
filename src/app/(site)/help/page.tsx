import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  LockKeyhole,
  Headset,
  Package,
  Scale,
  Search,
  ShieldCheck,
} from "lucide-react";
import { ContentCard } from "@/components/shared/content-card";
import { InformationAccordion } from "@/components/shared/information-accordion";
import { PageContainer, SectionContainer } from "@/components/layout/page-container";
import { PageHeading } from "@/components/layout/page-heading";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { getSettings } from "@/server/data";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Help centre",
  description:
    "TereaCOD help centre — ordering, delivery and payment answers, UAE age rules, safety basics, your data and the support desk for the UAE's TEREA delivery specialist.",
  ...canonical("/help"),
};

const HELP_FAQS = (settings: Awaited<ReturnType<typeof getSettings>>) => [
  {
    id: "help-faq-age",
    title: "What is the legal age to buy nicotine products in the UAE?",
    content: (
      <p className="max-w-prose">
        {settings.ageRestrictionNotice} Age verification is applied at purchase and repeated at delivery with an
        Emirates ID check at the door.
      </p>
    ),
  },
  {
    id: "help-faq-setup",
    title: "How do I set up my device for the first time?",
    content: (
      <p className="max-w-prose">
        Charge fully with the supplied USB-C cable, seat the pod or coil, and wait five minutes after filling before
        your first draw so the coil saturates. Power on and off with five quick presses of the side button — full steps
        are in the{" "}
        <Link href="/help/faq#device-setup" className="text-violet-soft underline-offset-4 hover:underline">
          device FAQ
        </Link>
        .
      </p>
    ),
  },
  {
    id: "help-faq-batch",
    title: "How do I check my product is genuine?",
    content: (
      <p className="max-w-prose">
        Every brand we stock ships with its own authenticity scratch panel or QR code on the packaging. Scratch, scan,
        or WhatsApp us the code — we verify it against our Dubai stock records and confirm it for you.
      </p>
    ),
  },
];

const TOPICS: Array<{ title: string; body: string; href: string; icon: React.ComponentType<{ className?: string }> }> = [
  {
    title: "Getting started",
    body: "Device setup, first draws and everyday care — start here.",
    href: "/help/faq#device-setup",
    icon: BookOpen,
  },
  {
    title: "Safety basics",
    body: "Storage, charging, disposal and how to report an issue.",
    href: "/safety",
    icon: ShieldCheck,
  },
  {
    title: "Compliance & age rules",
    body: "The 18+ rule, ID checks at the door and how we verify every listing.",
    href: "/compliance",
    icon: Scale,
  },
  {
    title: "Orders & delivery",
    body: "Timelines, changes and what to expect at the door.",
    href: "/account/orders",
    icon: Package,
  },
  {
    title: "Your data",
    body: "Privacy rights, requests and account controls.",
    href: "/account/privacy",
    icon: LockKeyhole,
  },
  {
    title: "Contact support",
    body: "Reach the support desk — replies within two business days.",
    href: "/contact",
    icon: Headset,
  },
];

export default async function HelpPage() {
  const settings = await getSettings();

  return (
    <PageContainer width="default" className="pb-16 sm:pb-24">
      <PageHeading
        eyebrow="Help centre"
        title="Answers, before you need them"
        lead="Practical help for ordering from TereaCOD — products, delivery, payments, safety and your data — written the way we would want to read it."
      />

      {/* Search entry */}
      <SectionContainer spacing="sm" className="pt-2">
        <RevealSection>
          <h2 className="sr-only">Search</h2>
          <Link
            href="/search"
            className="group flex items-center gap-4 rounded-2xl border border-line bg-elevated/50 p-5 transition-colors hover:border-violet-glow/40 sm:p-6"
          >
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-foreground/[0.04] text-violet-soft"
              aria-hidden="true"
            >
              <Search className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[1.1rem] font-semibold text-foreground">
                Search help articles and FAQs
              </span>
              <span className="mt-1 block text-[0.85rem] text-muted-foreground">
                Products, specifications, FAQs and help pages — all in one place.
              </span>
            </span>
            <ArrowRight
              className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </RevealSection>
      </SectionContainer>

      {/* Topic grid */}
      <SectionContainer spacing="sm">
        <RevealSection className="max-w-prose">
          <h2 className="font-display text-h3 font-semibold text-foreground">Browse by topic</h2>
        </RevealSection>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic, i) => (
            <ContentCard key={topic.href} title={topic.title} body={topic.body} href={topic.href} icon={topic.icon} index={i} />
          ))}
        </div>
      </SectionContainer>

      {/* Escalation */}
      <SectionContainer spacing="sm">
        <RevealSection>
          <div className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-prose">
                <h2 className="font-display text-h3 font-semibold text-foreground">Still stuck?</h2>
                <p className="mt-2 text-legal leading-relaxed text-foreground/85">
                  Contact the support desk — replies within two business days. Write to{" "}
                  <a
                    href={`mailto:${settings.contact.supportEmail}`}
                    className="text-violet-soft underline-offset-4 hover:underline"
                  >
                    {settings.contact.supportEmail}
                  </a>{" "}
                  or use the enquiry form on the contact page.
                </p>
              </div>
            </div>
            <p className="mt-4 border-t border-line pt-4 text-legal leading-relaxed text-muted-foreground">
              If something went wrong with a product or order, our complaints procedure — support desk first, compliance
              office second — is described in{" "}
              <Link href="/legal/consumer-information" className="text-foreground underline-offset-4 hover:underline">
                Consumer Information
              </Link>
              .
            </p>
          </div>
        </RevealSection>
      </SectionContainer>

      {/* FAQ preview */}
      <SectionContainer spacing="sm">
        <RevealSection className="max-w-prose">
          <h2 className="font-display text-h3 font-semibold text-foreground">Top questions</h2>
          <p className="mt-2 text-legal text-muted-foreground">
            The three we hear most — the full list lives in the{" "}
            <Link href="/help/faq" className="text-foreground underline-offset-4 hover:underline">
              FAQ
            </Link>
            .
          </p>
        </RevealSection>
        <RevealSection className="mt-6">
          <InformationAccordion panels={HELP_FAQS(settings)} defaultOpen="help-faq-age" />
        </RevealSection>
      </SectionContainer>
    </PageContainer>
  );
}
