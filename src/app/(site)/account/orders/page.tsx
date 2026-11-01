import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { OrdersView } from "./orders-view";
import { requireAccountSession } from "../gate";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Order history",
  description: "Your TereaCOD order history — track every order's status, items and delivery details in one place.",
};

export default async function OrdersPage() {
  await requireAccountSession("/account/orders");
  return (
    <AccountPage
      title="Order history"
      eyebrow="Member area"
      lead="Every order you place at checkout appears here with its live status. Demo orders from our launch dataset may appear below."
    >
      <OrdersView />
    </AccountPage>
  );
}
