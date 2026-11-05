import Link from "next/link";
import { Logo } from "./logo";
import { getSettings, footerColumns, legalNav } from "@/server/data";
import { ExternalLink } from "lucide-react";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { buildWhatsAppLink, composeSupportMessage } from "@/services/whatsapp";
import { UspStrip } from "@/components/shared/usp-strip";

/**
 * Brand glyphs as inline SVG — lucide-react 1.x dropped brand icons,
 * and social marks must not depend on a generic icon set anyway.
 * Same 24-viewBox box sizing as lucide so `size-4` keeps working.
 */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125M7.119 20.452H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram: InstagramIcon,
  X: XIcon,
  LinkedIn: LinkedinIcon,
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
      {/* Delivery promises — the ordering USPs, visible on every page.
          UspStrip keeps the 1-hour promise visually emphasized. */}
      <UspStrip className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8" />
      {/* Bottom padding clears the fixed mobile bottom nav (h-14 + safe-area);
          md+ drops it once the nav is hidden. */}
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6 sm:pt-12 md:pb-10 lg:px-8">
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
