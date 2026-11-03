import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import Link from "next/link";
import { AlertTriangle, FileBadge2, ShieldCheck } from "lucide-react";
import { PageContainer, SectionContainer } from "@/components/layout/page-container";
import { PageHeading } from "@/components/layout/page-heading";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { DocumentCard } from "@/components/shared/content-card";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { StatusBadge, ComplianceStatusBadge } from "@/components/shared/status-badge";
import { getComplianceRecords } from "@/server/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  ...canonical("/compliance"),
  title: "Compliance",
  description:
    "TereaCOD compliance centre — age restrictions, health warnings, product conformity records, business credentials and regulatory disclosures for the UAE.",
};

const AGE_POINTS = [
  "Minimum purchase age: 18 years — it is illegal to sell nicotine products to anyone under 18 in the United Arab Emirates.",
  "Age verification is applied at purchase and repeated at delivery, with an Emirates ID check at the door.",
  "Staff and courier partners are trained to refuse sales where verification cannot be completed.",
];

const HEALTH_WARNINGS = [
  "WARNING: This product contains nicotine. Nicotine is an addictive chemical.",
  "Not recommended for non-smokers.",
  "Not for use by pregnant or breastfeeding women.",
  "Not for persons with heart conditions or high blood pressure.",
  "Keep all products out of reach of children and pets.",
];

const BUSINESS_CREDENTIALS = [
  {
    title: "Trade licence — Dubai DED",
    body: "TereaCOD Trading L.L.C. holds a Dubai Department of Economy and Tourism licence covering vapor trading. Registry extract available on request.",
  },
  {
    title: "Establishment card & references",
    body: "Establishment card and premises references for our Downtown Dubai office. Copies available on request.",
  },
  {
    title: "Import registrations",
    body: "Customs registration for lithium-cell and liquid imports. Declaration summaries available on request.",
  },
];

export default async function CompliancePage() {
  const complianceRecords = await getComplianceRecords();

  return (
    <PageContainer width="default" className="pb-16 sm:pb-24">
      <PageHeading
        eyebrow="Compliance"
        title="Compliance centre"
        lead="How TereaCOD documents age rules, health warnings, product conformity and business credentials — with every record's status shown honestly."
      />

      <RevealSection>
        <PrototypeNotice>
          These records reflect our live compliance register — the register itself does not establish compliance, and
          verified documents are shared on request.
        </PrototypeNotice>
      </RevealSection>

      {/* (a) Age restrictions */}
      <SectionContainer spacing="sm" className="pt-8">
        <RevealSection>
          <section id="age-restrictions" aria-labelledby="age-restrictions-heading" className="scroll-mt-28 rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="age-restrictions-heading" className="flex items-center gap-2.5 font-display text-h3 font-semibold text-foreground">
                <ShieldCheck className="size-5 text-violet-soft" aria-hidden="true" />
                Age restrictions
              </h2>
              <PrototypeNotice variant="compact">18+ check at checkout &amp; delivery</PrototypeNotice>
            </div>
            <ul className="mt-4 max-w-prose space-y-2">
              {AGE_POINTS.map((point) => (
                <li key={point} className="flex gap-2.5 text-legal leading-relaxed text-foreground/85">
                  <span className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-violet-soft" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-4 text-legal leading-relaxed text-muted-foreground">
              Ordering is live: every checkout requires an 18+ age confirmation, and the courier verifies a valid
              Emirates ID at the door before handover. Payment is cash or card on delivery only, in line with UAE
              regulations. Third-party verification integrations (Turnstile, Stripe) are in rollout — provider
              assessments are tracked in the register below.
            </p>
          </section>
        </RevealSection>
      </SectionContainer>

      {/* (b) Health warnings */}
      <SectionContainer spacing="sm">
        <RevealSection>
          <section id="health-warnings" aria-labelledby="health-warnings-heading" className="scroll-mt-28 rounded-2xl border border-warning/25 bg-warning/[0.05] p-5 sm:p-6">
            <h2 id="health-warnings-heading" className="flex items-center gap-2.5 font-display text-h3 font-semibold text-warning">
              <AlertTriangle className="size-5" aria-hidden="true" />
              Health warnings
            </h2>
            <ul className="mt-4 max-w-prose space-y-2">
              {HEALTH_WARNINGS.map((warning) => (
                <li key={warning} className="flex gap-2.5 text-legal leading-relaxed text-foreground/90">
                  <span className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                  {warning}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-warning/20 pt-4 text-legal text-muted-foreground">
              Full regulated-category wording:{" "}
              <Link href="/legal/consumer-information" className="text-foreground underline-offset-4 hover:underline">
                Consumer Information
              </Link>
              .
            </p>
          </section>
        </RevealSection>
      </SectionContainer>

      {/* (c) Product conformity register */}
      <SectionContainer spacing="sm">
        <RevealSection className="max-w-prose">
          <h2 className="font-display text-h3 font-semibold text-foreground">Product conformity</h2>
          <p className="mt-2 text-legal text-muted-foreground">
            The document inventory behind the range — each record shows its honest review status. Documents are shared
            on request while the production portal is pending.
          </p>
        </RevealSection>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {complianceRecords.map((record, i) => (
            <RevealSection key={record.id} delay={Math.min(i * 0.05, 0.3)} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-meta uppercase tracking-[0.16em] text-violet-soft">{record.area}</p>
                    <h3 className="mt-1 font-display text-[1.02rem] font-semibold text-foreground">{record.title}</h3>
                  </div>
                  <ComplianceStatusBadge status={record.status} />
                </div>
                <p className="mt-3 flex-1 text-legal leading-relaxed text-foreground/85">{record.description}</p>
                <p className="mt-4 font-mono text-meta leading-relaxed text-muted-foreground">
                  {record.lastReviewed ? `Last reviewed: ${formatDate(record.lastReviewed)}` : "Last reviewed: —"}
                  {record.expiresAt ? ` · Expires: ${formatDate(record.expiresAt)}` : ""}
                  {record.owner ? ` · Owner: ${record.owner}` : ""}
                </p>
                {record.documents.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {record.documents.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        title={doc.title}
                        type={doc.type}
                        href={doc.href}
                        note="Available on request"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Documents not yet attached to this record.
                  </p>
                )}
              </article>
            </RevealSection>
          ))}
        </div>
      </SectionContainer>

      {/* (d) Business credentials */}
      <SectionContainer spacing="sm">
        <RevealSection className="max-w-prose">
          <h2 className="font-display text-h3 font-semibold text-foreground">Business credentials</h2>
        </RevealSection>
        <ul className="mt-6 space-y-3">
          {BUSINESS_CREDENTIALS.map((item, i) => (
            <RevealSection as="li" key={item.title} delay={i * 0.05}>
              <div className="flex items-start gap-4 rounded-2xl border border-line bg-elevated/50 p-5">
                <span
                  className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-foreground/[0.04] text-violet-soft"
                  aria-hidden="true"
                >
                  <FileBadge2 className="size-[1.1rem]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-[1rem] font-semibold text-foreground">{item.title}</h3>
                    <StatusBadge tone="neutral">Available on request</StatusBadge>
                  </div>
                  <p className="mt-1.5 max-w-prose text-legal leading-relaxed text-foreground/85">{item.body}</p>
                </div>
              </div>
            </RevealSection>
          ))}
        </ul>
      </SectionContainer>

      {/* (e) Regulatory disclosures */}
      <SectionContainer spacing="sm">
        <RevealSection className="max-w-prose">
          <h2 className="font-display text-h3 font-semibold text-foreground">Regulatory disclosures</h2>
        </RevealSection>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RevealSection className="h-full">
            <section aria-labelledby="pdpl-heading" className="h-full rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
              <h3 id="pdpl-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
                UAE Federal Decree-Law No. 45 of 2021 (PDPL)
              </h3>
              <p className="mt-2 text-legal leading-relaxed text-foreground/85">
                The Personal Data Protection Law governs how personal data is processed in the UAE. Our{" "}
                <Link href="/legal/privacy" className="text-violet-soft underline-offset-4 hover:underline">
                  Privacy Notice
                </Link>{" "}
                maps the data we hold, the purposes we serve and your rights under the decree.
              </p>
            </section>
          </RevealSection>
          <RevealSection delay={0.08} className="h-full">
            <section aria-labelledby="esma-heading" className="h-full rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
              <h3 id="esma-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
                ESMA conformity references
              </h3>
              <p className="mt-2 text-legal leading-relaxed text-foreground/85">
                Devices and liquids distributed in the UAE reference the national conformity schemes administered
                through ESMA / the Ministry of Industry and Advanced Technology. The conformity file for the UAE market
                (UAQ/ESMA) is currently pending in the register below.
              </p>
            </section>
          </RevealSection>
        </div>
      </SectionContainer>

      {/* (f) Document availability + last reviewed */}
      <SectionContainer spacing="sm">
        <RevealSection>
          <section id="availability" aria-labelledby="availability-heading" className="scroll-mt-28 rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
            <h2 id="availability-heading" className="font-display text-h3 font-semibold text-foreground">
              Document availability
            </h2>
            <p className="mt-3 max-w-prose text-legal leading-relaxed text-foreground/85">
              Every document listed on this page is available on request while the production document portal is
              pending. Records marked verified link to their summaries first once documents are uploaded; missing and
              expired records are shown as-is until the underlying paperwork is refreshed.
            </p>
            <p className="mt-4 font-mono text-meta uppercase tracking-[0.1em] text-muted-foreground">
              Record status and review dates come straight from the live compliance register.
            </p>
          </section>
        </RevealSection>
      </SectionContainer>
    </PageContainer>
  );
}
