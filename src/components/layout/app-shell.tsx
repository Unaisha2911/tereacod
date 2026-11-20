import { GradientBackdrop } from "@/components/atmosphere/gradient-backdrop";
import { AgeGate } from "./age-gate";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { BottomNavigation } from "./bottom-navigation";
import { FloatingWhatsAppButton } from "./floating-whatsapp";
import { headerNav, mobileNav, footerColumns, legalNav } from "@/server/data";
import type { NavigationItem } from "@/types";

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
  // Navigation is chrome, not content: on a transient D1/KV blip the page
  // must still render (logo, search, cart, account, footer compliance strip
  // are all hardcoded) instead of falling to the "something went wrong"
  // boundary — the exact refresh-time symptom this guards. The nav repo is
  // cached 60s with 15min stale-on-error retention, so this fallback only
  // fires on a cold-cache failure; the next navigation refills normally.
  //
  // Typed as the EXACT tuple Promise.all resolves with. A loose
  // NavigationItem[][] fallback widens the awaited value to
  // `tuple | NavigationItem[][]`, and destructuring that union mis-types
  // footerCols as `NavigationItem[][] | NavigationItem[]` — the production
  // type check (next build) rejected it; dev mode never surfaced it.
  const fallback: [
    NavigationItem[],
    NavigationItem[],
    NavigationItem[][],
    NavigationItem[],
  ] = [[], [], [], []];
  const [header, mobile, footerCols, legal] = await Promise.all([
    headerNav(),
    mobileNav(),
    footerColumns(),
    legalNav(),
  ]).catch(() => fallback);

  return (
    <div className="relative flex min-h-screen flex-col">
      <GradientBackdrop variant="page" />
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
