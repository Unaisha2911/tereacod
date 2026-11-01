import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { ForgotPasswordView } from "./forgot-password-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Forgot password",
  description: "Request a TereaCOD password reset — we'll email you a secure link if an account exists.",
};

export default function ForgotPasswordPage() {
  return (
    <AccountPage title="Forgot password" layout="center">
      <ForgotPasswordView />
    </AccountPage>
  );
}
