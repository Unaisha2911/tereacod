import { AppShell } from "@/components/layout/app-shell";
import { AppBootstrap } from "@/components/layout/app-bootstrap";
import { getFeatureFlags } from "@/server/repos/settings";
import { getCurrentIdentity } from "@/server/auth-context";
import { hasPermission } from "@/server/rbac";

/**
 * Public-site layout — wraps every public page (including account)
 * with the AppShell: gradient backdrop, ambient smoke, header,
 * sticky footer and mobile bottom navigation. The AppBootstrap provider
 * hydrates the client stores (auth, server cart, saved items, site
 * config) once per page load.
 *
 * Maintenance enforcement (QA audit Task 26): when the admin-toggled
 * `features.maintenance` flag is on, non-staff visitors get the offline
 * notice instead of storefront pages. Staff keep full access, and the
 * admin console lives outside this layout so it always stays reachable.
 *
 * Render the ENTIRE public site dynamically (per request).
 *
 * Why: header nav, footer columns, homepage sections, FAQ and legal bodies
 * all read D1/KV. If this segment were statically prerendered, pages would
 * bake whatever database the BUILD machine happened to have — a CI runner's
 * auto-migrated empty db/tereacod.db produces the exact "menu items and
 * homepage products/brands/collections missing" defect seen in production,
 * and even a seeded build freezes content until the next deploy (products
 * added from the admin console would never appear). Dynamic rendering makes
 * the build machine's DB state irrelevant and admin edits visible instantly;
 * on Workers the D1/KV reads are co-located and sub-millisecond.
 */
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const flags = await getFeatureFlags();
  if (flags.maintenance) {
    const identity = await getCurrentIdentity();
    const isStaff = identity ? hasPermission(identity.roles, "catalog.read") : false;
    if (!isStaff) {
      return (
        <AppShell>
          <main
            id="main-content"
            className="flex min-h-[70svh] flex-col items-center justify-center px-6 py-24 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              TereaCOD
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-balance md:text-4xl">
              We are briefly offline for scheduled maintenance
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Our store is being tuned behind the scenes. We will be back shortly —
              thank you for your patience.
            </p>
          </main>
        </AppShell>
      );
    }
  }

  return (
    <AppShell>
      {/* Page-wide smoke textures — the fixed AmbientSmoke in the app shell
          is the ONLY smoke on the site (hero/section layers were removed
          for homepage speed) and references these from CSS masks, which
          browsers discover late, so preload both — but at LOW priority:
          they are decorative backdrop, and a high-priority preload raced
          the LCP headline for bandwidth (Pingdom waterfall showed the
          wisps plate fetching ahead of above-the-fold content). Lives
          HERE (not the root layout): the admin console ships no smoke. */}
      <link rel="preload" as="image" href="/smoke/smoke-wisps.avif" fetchPriority="low" />
      <link rel="preload" as="image" href="/smoke/smoke-plume.avif" fetchPriority="low" />
      <AppBootstrap>{children}</AppBootstrap>
    </AppShell>
  );
}
