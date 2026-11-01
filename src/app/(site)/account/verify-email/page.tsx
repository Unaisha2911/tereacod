import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { VerifyEmailView } from "./verify-email-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Verify your email",
  description: "Enter the 6-digit verification code we emailed you to activate your TereaCOD account.",
};

export default function VerifyEmailPage() {
  return (
    <AccountPage title="Verify your email" layout="center">
      {/* Suspense boundary is required: VerifyEmailView reads useSearchParams
          (prefilled email/code). Without it a static prerender of this route
          fails the production build (missing-suspense-with-csr-bailout). */}
      <Suspense fallback={<LoadingIndicator label="Loading" className="py-6" />}>
        <VerifyEmailView />
      </Suspense>
    </AccountPage>
  );
}
