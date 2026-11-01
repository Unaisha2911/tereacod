import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { PrivacyView } from "./privacy-view";
import { requireAccountSession } from "../gate";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Privacy",
  description: "Review the data stored on your TereaCOD account and submit access or deletion requests.",
};

export default async function PrivacyPage() {
  await requireAccountSession("/account/privacy");
  return (
    <AccountPage
      title="Your privacy"
      eyebrow="Member area"
      lead="See what your account holds, and exercise your data rights — requests are handled by our privacy team."
    >
      <PrivacyView />
    </AccountPage>
  );
}
