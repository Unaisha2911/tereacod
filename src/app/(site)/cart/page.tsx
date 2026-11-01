import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Cart",
  description:
    "Review the TereaCOD products in your bag — quantities, options and AED totals before checkout.",
};

export default function CartPage() {
  return <CartView />;
}
