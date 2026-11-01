import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { SavedView } from "./saved-view";
import { requireAccountSession } from "../gate";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Saved items",
  description: "Products you bookmarked at TereaCOD — synced to your account when you're signed in.",
};

export default async function SavedPage() {
  await requireAccountSession("/account/saved");
  return (
    <AccountPage
      title="Saved items"
      eyebrow="Member area"
      lead="Your bookmarked devices and liquids — synced to your account when you're signed in."
    >
      <SavedView />
    </AccountPage>
  );
}
