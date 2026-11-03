import { GradientBackdrop } from "@/components/atmosphere/gradient-backdrop";
import { AmbientSmoke } from "@/components/atmosphere/ambient-smoke";
import { AgeGate } from "./age-gate";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { BottomNavigation } from "./bottom-navigation";
import { FloatingWhatsAppButton } from "./floating-whatsapp";
import { headerNav, mobileNav, footerColumns, legalNav } from "@/server/data";

/**
 * AppShell — public site frame.
 *
 * min-h-screen flex column: header (fixed) → main (flex-1) → footer
 * (mt-auto, sticky-to-bottom when content is short, pushed naturally
 * when long). The mobile bottom nav overlays the viewport; the footer
 * carries its own bottom padding so the legal strip stays clear of it.
 *
 * Navigation data is fetched here (server) and passed into the client
 * chrome — client components never read the data layer directly.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const [header, mobile, footerCols, legal] = await Promise.all([
    headerNav(),
    mobileNav(),
    footerColumns(),
    legalNav(),
  ]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <GradientBackdrop variant="page" />
      {/* Continuous ambient signature — page-level smoke, red mixed in.
          Perf: intensity trimmed (0.85 → 0.7) alongside the preset layer
          reduction to cut scroll-compositing cost on the homepage. */}
      <AmbientSmoke preset="ambient" palette="mixed" intensity={0.7} zIndexClass="-z-10" position="fixed" />
      <SiteHeader headerNav={header} mobileNav={mobile} footerColumns={footerCols} legalNav={legal} />
      {/* pt clears the fixed header (announcement strip 2.25rem + nav 4rem). */}
      <main id="main-content" className="flex-1 pt-[6.25rem]">{children}</main>
      <SiteFooter />
      <BottomNavigation items={mobile} />
      {/* Conversational ordering CTA — fixed bottom-right, above the mobile nav */}
      <FloatingWhatsAppButton />
      {/* Site-entry 18+ age gate — REQUIRED compliance surface. Renders on
          every public page; CSS-driven visibility (zero flash) and consent
          is stored in localStorage so it only ever prompts once. */}
      <AgeGate />
    </div>
  );
}
