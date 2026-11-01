import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { OverviewView } from "./overview-view";
import { requireAccountSession } from "./gate";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Account",
  description: "Your TereaCOD account overview — profile, saved items, recent orders and security at a glance.",
};

export default async function AccountOverviewPage() {
  await requireAccountSession("/account");
  return (
    <AccountPage
      title="Account"
      eyebrow="Member area"
      lead="Your account at a glance — profile, security, saved items and recent orders, straight from your TereaCOD account."
    >
      <OverviewView />
    </AccountPage>
  );
}
