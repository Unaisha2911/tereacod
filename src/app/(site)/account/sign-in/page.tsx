import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { SignInView } from "./sign-in-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Sign in",
  description: "Sign in to your TereaCOD account to track orders, sync saved items and check out faster.",
};

export default function SignInPage() {
  return (
    <AccountPage title="Sign in" layout="center">
      {/* Suspense boundary is required: SignInView reads useSearchParams
          (redirect target). Without it a static prerender of this route
          fails the production build (missing-suspense-with-csr-bailout). */}
      <Suspense fallback={<LoadingIndicator label="Loading" className="py-6" />}>
        <SignInView />
      </Suspense>
    </AccountPage>
  );
}
