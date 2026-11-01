import Link from "next/link";
import { Logo } from "./logo";
import { getSettings, footerColumns, legalNav } from "@/server/data";
import { Instagram, Twitter, Linkedin, ExternalLink } from "lucide-react";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { buildWhatsAppLink, composeSupportMessage } from "@/services/whatsapp";

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram,
  X: Twitter,
  LinkedIn: Linkedin,
};

/**
 * SiteFooter — brand mark, nav columns, legal strip, regulatory
 * notices and support contact. mt-auto keeps it bottom-sticky inside
 * the min-h-screen flex shell.
 */
export async function SiteFooter() {
  const [columns, legal, settings] = await Promise.all([footerColumns(), legalNav(), getSettings()]);
  const year = new Date().getFullYear();
  // Accessible nav names mirror the visible headings (Explore/Company/Support).
  const columnNames = ["Explore", "Company", "Support"] as const;

  return (
    <footer className="relative mt-auto border-t border-line bg-abyss">
      {/* Bottom padding clears the fixed mobile bottom nav (h-14 + safe-area);
          md+ drops it once the nav is hidden. */}
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16 md:pb-10 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* Brand */}
          <div className="space-y-5">
            <Logo brandName={settings.brandName} />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {settings.description}
            </p>
            <ul className="flex items-center gap-2">
              {settings.social.map((s) => {
                const Icon = SOCIAL_ICONS[s.label] ?? ExternalLink;
                return (
                  <li key={s.id}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${settings.brandName} on ${s.label}`}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-line text-muted-foreground transition-colors hover:border-violet-glow/40 hover:text-foreground"
                    >
                      <Icon className="size-4" />
                    </a>
                  </li>
                );
              })}
              <li>
                <a
                  href={buildWhatsAppLink(composeSupportMessage())}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Chat with ${settings.brandName} on WhatsApp`}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-[#25d366]/35 text-muted-foreground transition-colors hover:border-[#25d366]/70 hover:text-[#15803d] hover:shadow-[0_0_16px_rgba(37,211,102,0.3)] dark:hover:text-[#4be382]"
                >
                  <WhatsAppIcon className="size-4" />
                </a>
              </li>
            </ul>
            <p className="text-[0.78rem] text-muted-foreground">
              WhatsApp orders:{" "}
              <a
                href={buildWhatsAppLink(composeSupportMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#15803d] underline-offset-4 transition-colors hover:underline dark:text-[#4be382]"
              >
                {settings.contact.whatsapp}
              </a>
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col, idx) => (
            <nav key={idx} aria-label={columnNames[idx] ?? `Footer links ${idx + 1}`}>
              <h2 className="text-label font-semibold uppercase tracking-[0.18em] text-foreground/80">
                {columnNames[idx] ?? (idx === 0 ? "Explore" : idx === 1 ? "Company" : "Support")}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Age notice */}
        <div className="mt-12 rounded-2xl border border-line bg-foreground/[0.02] p-4 sm:p-5">
          <p className="text-legal text-muted-foreground">
            <span className="font-semibold text-foreground">Restricted products.</span>{" "}
            {settings.ageRestrictionNotice} {settings.complianceNotice}
          </p>
        </div>

        {/* Legal strip */}
        <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legal.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="text-[0.8rem] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-[0.75rem] text-muted-foreground">
            © {year} {settings.brandLegalName}. All rights reserved. Dubai, United Arab Emirates.
          </p>
        </div>
      </div>
    </footer>
  );
}
