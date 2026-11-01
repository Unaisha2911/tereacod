"use client";

import { BookOpen, LifeBuoy, Mail, Phone, type LucideIcon } from "lucide-react";
import { NeonHeading } from "./neon-heading";
import { SectionContainer } from "@/components/layout/page-container";
import { ContentCard } from "@/components/shared/content-card";
import type { SiteSettings } from "@/types";

type SupportEntry = {
  title: string;
  body: string;
  href: string;
  icon: LucideIcon;
};

const SUPPORT_ITEMS: SupportEntry[] = [
  { title: "Help centre", body: "Delivery windows, order help and device care guides.", href: "/help", icon: LifeBuoy },
  { title: "FAQs", body: "Quick answers on batches, strengths and storage.", href: "/help/faq", icon: BookOpen },
  { title: "Contact", body: "Direct lines to the Dubai team and response times.", href: "/contact", icon: Mail },
];

/**
 * SupportSection — final support entry point with direct contact row
 * fed from site settings. Settings are passed in from the
 * server-rendered homepage.
 */
export function SupportSection({ SITE_SETTINGS }: { SITE_SETTINGS: SiteSettings }) {
  const { supportEmail, phone } = SITE_SETTINGS.contact;

  return (
    <SectionContainer spacing="default">
      <section aria-labelledby="support-heading">
        <div className="max-w-2xl">
          <NeonHeading
            id="support-heading"
            eyebrow="Support"
            title="Need"
            accent="a hand?"
            iceAccent
          />
          <p className="mt-5 text-[0.95rem] leading-relaxed text-muted-foreground">
            Real humans in Dubai, Sunday to Thursday — on WhatsApp, email or
            phone. Order updates, delivery windows and device questions,
            answered the same business day.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {SUPPORT_ITEMS.map((entry, index) => (
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

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Mail className="size-4" aria-hidden="true" />
            {supportEmail}
          </a>
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Phone className="size-4" aria-hidden="true" />
            {phone}
          </a>
        </div>
      </section>
    </SectionContainer>
  );
}
