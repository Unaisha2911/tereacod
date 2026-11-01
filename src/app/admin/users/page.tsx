import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminBasePath } from "@/server/console";
import { getCurrentIdentity } from "@/server/auth-context";
import { hasPermission } from "@/server/rbac";
import { UsersView } from "./users-view";

export const metadata: Metadata = {
  title: "Users",
};

export default async function AdminUsersPage() {
  // Per-page permission gate (QA audit): staff rosters require staff.manage.
  const identity = await getCurrentIdentity();
  if (!identity || !hasPermission(identity.roles, "staff.manage")) redirect(adminBasePath());

  return <UsersView />;
}
