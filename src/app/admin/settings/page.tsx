import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminBasePath } from "@/server/console";
import { getSettings } from "@/server/data";
import { getCurrentIdentity } from "@/server/auth-context";
import { hasPermission } from "@/server/rbac";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  // Per-page permission gate (QA audit): the layout only enforces isStaff;
  // the settings editor itself requires settings.write.
  const identity = await getCurrentIdentity();
  if (!identity || !hasPermission(identity.roles, "settings.write")) redirect(adminBasePath());

  const settings = await getSettings();
  return <SettingsView settings={settings} />;
}
