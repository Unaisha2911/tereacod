import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminBasePath } from "@/server/console";
import { getCurrentIdentity } from "@/server/auth-context";
import { hasPermission } from "@/server/rbac";
import { MediaLibraryView } from "./media-library-view";

export const metadata: Metadata = { title: "Media library" };

export default async function AdminMediaPage() {
  // Per-page permission gate (QA audit): the library requires media.read.
  const identity = await getCurrentIdentity();
  if (!identity || !hasPermission(identity.roles, "media.read")) redirect(adminBasePath());

  return <MediaLibraryView />;
}
