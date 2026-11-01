import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { SecurityView } from "./security-view";
import { requireAccountSession } from "../gate";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Security",
  description: "Manage your TereaCOD account security — active sessions, security notifications and planned MFA.",
};

export default async function SecurityPage() {
  await requireAccountSession("/account/security");
  return (
    <AccountPage
      title="Security"
      eyebrow="Member area"
      lead="Session management and security alerts. Password changes are rolling out with email verification."
    >
      <SecurityView />
    </AccountPage>
  );
}
