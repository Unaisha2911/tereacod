import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/shared/admin-shell";
import { getCurrentIdentity } from "@/server/auth-context";
import { adminBasePath } from "@/server/console";
import { getUserPermissionSet, isStaff } from "@/server/rbac";

/**
 * Admin layout — wraps every console route with the AdminShell
 * (collapsible sidebar, topbar, breadcrumbs, chrome footer) and enforces
 * the staff gate server-side.
 *
 * Unified login: the console lives at the plain /admin URL. Anonymous
 * visitors are redirected to the shared /account/sign-in form (middleware
 * handles the cookie-less case with a hard 307; this catches stale/invalid
 * cookies too). Signed-in customers without a staff role are redirected to
 * the /restricted page — no 404 oracle games are needed anymore because the
 * path is not a secret.
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
  const identity = await getCurrentIdentity();
  if (!identity) {
    redirect("/account/sign-in?next=" + encodeURIComponent("/admin"));
  }
  const roles = await getUserPermissionSet(identity.user.id);
  if (!isStaff(roles)) {
    redirect("/restricted");
  }
  return <AdminShell basePath={adminBasePath()}>{children}</AdminShell>;
}
