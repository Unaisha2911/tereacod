import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { RegisterView } from "./register-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Create account",
  description: "Create your TereaCOD account — orders, saved items and your bag synced on every device. 18+ only.",
};

export default function RegisterPage() {
  return (
    <AccountPage title="Create account" layout="center" centerWidth="lg">
      <RegisterView />
    </AccountPage>
  );
}
