import type { Metadata } from "next";
import { CheckoutView } from "./checkout-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Checkout",
  description:
    "Confirm contact and delivery details, choose cash or card on delivery and place your TereaCOD order across the UAE.",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
