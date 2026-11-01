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
      {/* Continuous ambient signature — dense page-level smoke, red mixed in */}
      <AmbientSmoke preset="ambient" palette="mixed" intensity={0.85} zIndexClass="-z-10" position="fixed" />
      <SiteHeader headerNav={header} mobileNav={mobile} footerColumns={footerCols} legalNav={legal} />
      <main id="main-content" className="flex-1 pt-16">{children}</main>
      <SiteFooter />
      <BottomNavigation items={mobile} />
      {/* Conversational ordering CTA — fixed bottom-right, above the mobile nav */}
      <FloatingWhatsAppButton />
      {/* 18+ gate — appears 5s after landing, remembers confirmed adults (public site only) */}
      <AgeGate />
    </div>
  );
}
