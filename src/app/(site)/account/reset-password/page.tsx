import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountPage } from "@/components/account/account-page";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { ResetPasswordView } from "./reset-password-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Reset password",
  description: "Set a new password for your TereaCOD account and sign in with your updated credentials.",
};

export default function ResetPasswordPage() {
  return (
    <AccountPage title="Reset password" layout="center">
      <Suspense fallback={<LoadingIndicator label="Loading" className="py-6" />}>
        <ResetPasswordView />
      </Suspense>
    </AccountPage>
  );
}
