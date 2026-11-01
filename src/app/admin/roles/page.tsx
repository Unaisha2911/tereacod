import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminBasePath } from "@/server/console";
import { adminRoles } from "@/server/repos/admin";
import { getCurrentIdentity } from "@/server/auth-context";
import { hasPermission } from "@/server/rbac";
import { RolesView } from "./roles-view";

export const metadata: Metadata = {
  title: "Roles",
};

export default async function AdminRolesPage() {
  // Per-page permission gate (QA audit): role administration requires staff.manage.
  const identity = await getCurrentIdentity();
  if (!identity || !hasPermission(identity.roles, "staff.manage")) redirect(adminBasePath());

  const roles = await adminRoles();
  return <RolesView initialRoles={roles} />;
}
