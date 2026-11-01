import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/shared/admin-shell";
import { getCurrentIdentity } from "@/server/auth-context";
import { adminBasePath } from "@/server/console";
import { getUserPermissionSet, isStaff } from "@/server/rbac";

/**
 * Admin layout — wraps every console route with the AdminShell
 * (collapsible sidebar, topbar, breadcrumbs, chrome footer) and enforces
 * the staff gate server-side.
 *
 * Hard-404 gate: anonymous AND non-staff sessions both get the standard
 * not-found page — a redirect would confirm the secret path exists (a
 * guess-confirmation oracle for a signed-in customer). Staff sign in via
 * the normal /account/sign-in form first, then reach the console through
 * the secret path (post-sign-in redirect or the overview quick link).
 *
 * The console's public URL is the secret ADMIN_ACCESS_PATH (middleware
 * rewrites it onto these /admin/* routes and 404s the literal /admin), so
 * the shell is given the secret base for every nav/link it renders.
 *
 * The admin design language is calm and information-dense; the cinematic
 * atmosphere of the public site intentionally stops here.
 *
 * SEO: the console is operation-only — it is excluded from indexing
 * here (metadata) and in robots.txt.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const basePath = adminBasePath();
  const identity = await getCurrentIdentity();
  if (!identity) {
    notFound();
  }
  const roles = await getUserPermissionSet(identity.user.id);
  if (!isStaff(roles)) {
    notFound();
  }
  return <AdminShell basePath={basePath}>{children}</AdminShell>;
}
