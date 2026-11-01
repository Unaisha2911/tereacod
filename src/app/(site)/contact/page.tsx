import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import Link from "next/link";
import { Clock, Headset, Mail, MapPin, Phone, Scale } from "lucide-react";
import { PageContainer, SectionContainer } from "@/components/layout/page-container";
import { PageHeading } from "@/components/layout/page-heading";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { ContactForm } from "./contact-form";
import { getSettings } from "@/server/data";

export const metadata: Metadata = {
  ...canonical("/contact"),
  title: "Contact",
  description:
    "Contact TereaCOD — support desk, enquiries, complaints and escalation. Replies within two business days, Sunday to Thursday.",
};

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <span
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-foreground/[0.04] text-violet-soft"
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-meta uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-[0.9rem] leading-relaxed text-foreground">{children}</div>
      </div>
    </div>
  );
}

export default async function ContactPage() {
  const settings = await getSettings();
  const { contact, social } = settings;

  return (
    <PageContainer width="default" className="pb-16 sm:pb-24">
      <PageHeading
        eyebrow="Contact"
        title="Talk to the support desk"
        lead={`Enquiries, safety reports and privacy requests — ${contact.hours}. Replies within two business days.`}
      />

      <SectionContainer spacing="sm" className="pt-2">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: details + complaints */}
          <div className="space-y-6">
            <RevealSection>
              <section aria-labelledby="contact-details-heading" className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
                <h2 id="contact-details-heading" className="font-display text-[1.1rem] font-semibold text-foreground">
                  Contact details
                </h2>
                <div className="mt-5 space-y-5">
                  <ContactRow icon={Mail} label="General enquiries">
                    <a href={`mailto:${contact.email}`} className="underline-offset-4 hover:underline">
                      {contact.email}
                    </a>
                  </ContactRow>
                  <ContactRow icon={Headset} label="Support desk">
                    <a href={`mailto:${contact.supportEmail}`} className="underline-offset-4 hover:underline">
                      {contact.supportEmail}
                    </a>
                    <span className="mt-0.5 block text-[0.8rem] text-muted-foreground">
                      Replies within two business days
                    </span>
                  </ContactRow>
                  <ContactRow icon={Phone} label="Phone">
                    <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">
                      {contact.phone}
                    </a>
                  </ContactRow>
                  <ContactRow icon={MapPin} label="Address">
                    {contact.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </ContactRow>
                  <ContactRow icon={Clock} label="Hours">
                    {contact.hours}
                  </ContactRow>
                </div>
                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-meta uppercase tracking-[0.14em] text-muted-foreground">Social</p>
                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {social.map((item) => (
                      <li key={item.id}>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 items-center rounded-full border border-line bg-foreground/[0.03] px-3.5 text-[0.8rem] text-foreground transition-colors hover:border-violet-glow/40"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </RevealSection>

            <RevealSection delay={0.08}>
              <section aria-labelledby="complaints-heading" className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
                <h2 id="complaints-heading" className="flex items-center gap-2.5 font-display text-[1.1rem] font-semibold text-foreground">
                  <Scale className="size-[1.1rem] text-violet-soft" aria-hidden="true" />
                  Complaints
                </h2>
                <ol className="mt-4 space-y-3">
                  <li className="flex gap-3 text-legal leading-relaxed text-foreground/85">
                    <span className="font-mono text-meta text-violet-soft" aria-hidden="true">
                      01
                    </span>
                    <span>
                      <strong className="font-semibold text-foreground">Support desk first.</strong> Raise the issue
                      with support ({contact.supportEmail}). We reply within two business days and aim to resolve most
                      complaints at this step.
                    </span>
                  </li>
                  <li className="flex gap-3 text-legal leading-relaxed text-foreground/85">
                    <span className="font-mono text-meta text-violet-soft" aria-hidden="true">
                      02
                    </span>
                    <span>
                      <strong className="font-semibold text-foreground">Compliance office second.</strong> Unresolved
                      cases escalate to the compliance office, which responds in writing within five business days of
                      escalation.
                    </span>
                  </li>
                </ol>
                <p className="mt-4 border-t border-line pt-4 text-legal text-muted-foreground">
                  The formal procedure is described in{" "}
                  <Link href="/legal/consumer-information" className="text-foreground underline-offset-4 hover:underline">
                    Consumer Information
                  </Link>
                  . Safety reports can be raised through the same channel.
                </p>
              </section>
            </RevealSection>
          </div>

          {/* Right: enquiry form */}
          <RevealSection delay={0.05}>
            <section aria-labelledby="enquiry-heading" className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
              <h2 id="enquiry-heading" className="font-display text-[1.1rem] font-semibold text-foreground">
                Send an enquiry
              </h2>
              <p className="mt-1.5 text-legal text-muted-foreground">
                All fields marked <span aria-hidden="true">*</span><span className="sr-only">asterisk</span> are
                required.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </section>
          </RevealSection>
        </div>
      </SectionContainer>
    </PageContainer>
  );
}
