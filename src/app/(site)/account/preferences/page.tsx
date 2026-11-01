import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { PreferencesView } from "./preferences-view";
import { requireAccountSession } from "../gate";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Preferences",
  description: "Language, communications, privacy and accessibility preferences — saved to your TereaCOD account.",
};

export default async function PreferencesPage() {
  await requireAccountSession("/account/preferences");
  return (
    <AccountPage
      title="Preferences"
      eyebrow="Member area"
      lead="Tune how the site communicates with you and how it behaves. Preferences are saved to your account."
    >
      <PreferencesView />
    </AccountPage>
  );
}
