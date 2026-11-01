import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { SuccessView } from "./success-view";

export const metadata: Metadata = {
  title: "Order placed",
  description: "Your TereaCOD order has been placed — confirmation and next steps.",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingIndicator label="Loading confirmation" className="py-24" />}>
      <SuccessView />
    </Suspense>
  );
}
