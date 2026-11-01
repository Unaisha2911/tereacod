import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminBasePath } from "@/server/console";
import { ArrowLeft } from "lucide-react";
import { getCurrentIdentity } from "@/server/auth-context";
import { hasPermission } from "@/server/rbac";
import { adminCustomerBundle } from "@/server/repos/admin";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerDetailView } from "./customer-detail-view";

export const metadata: Metadata = {
  title: "Customer detail",
};

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Per-page permission gate (QA audit): customer records require customers.read.
  const identity = await getCurrentIdentity();
  if (!identity || !hasPermission(identity.roles, "customers.read")) redirect(adminBasePath());

  const { id } = await params;
  const bundle = await adminCustomerBundle(id);

  if (!bundle) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <EmptyState
          title="Customer not found"
          body={`No customer record matches the identifier "${id}". The record may have been removed from the database.`}
          actionLabel="Back to customers"
          actionHref={adminBasePath() + "/customers"}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        href={adminBasePath() + "/customers"}
        className="inline-flex items-center gap-2 text-[0.82rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to customers
      </Link>
      <CustomerDetailView
        customer={bundle.customer}
        attributedOrders={bundle.orders}
        relatedTickets={bundle.tickets}
      />
    </div>
  );
}
