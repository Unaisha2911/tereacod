import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminBasePath } from "@/server/console";
import { getCurrentIdentity } from "@/server/auth-context";
import { hasPermission } from "@/server/rbac";
import { getTicket } from "@/server/repos/support";
import { EmptyState } from "@/components/shared/empty-state";
import { TicketDetailView } from "./ticket-detail-view";

export const metadata: Metadata = {
  title: "Ticket detail",
};

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Per-page permission gate (QA audit): ticket records require support.read.
  const identity = await getCurrentIdentity();
  if (!identity || !hasPermission(identity.roles, "support.read")) redirect(adminBasePath());

  const { id } = await params;
  const key = decodeURIComponent(id);
  const ticket = await getTicket(key);

  if (!ticket) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <EmptyState
          title="Ticket not found"
          body={`No ticket matches "${key}". Try a ticket id or a reference such as TKT-2025-0001.`}
          actionLabel="Back to support"
          actionHref={adminBasePath() + "/support"}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <TicketDetailView ticket={ticket} />
    </div>
  );
}
