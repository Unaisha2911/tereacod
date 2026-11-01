import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminBasePath } from "@/server/console";
import { getCurrentIdentity } from "@/server/auth-context";
import { hasPermission } from "@/server/rbac";
import { AuditLogView } from "./audit-log-view";

export const metadata: Metadata = {
  title: "Audit log",
};

export default async function AdminAuditLogPage() {
  // Per-page permission gate (QA audit): audit records require audit.read.
  const identity = await getCurrentIdentity();
  if (!identity || !hasPermission(identity.roles, "audit.read")) redirect(adminBasePath());

  return <AuditLogView />;
}
