"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useConsolePath } from "@/components/shared/console-path";
import { Ban, FileClock, LifeBuoy, Package, ShieldCheck, ShieldOff, ShieldQuestion } from "lucide-react";
import type { AdminCustomer, OrderSummary, SupportTicket } from "@/types";
import { adminService } from "@/services/admin";
import { StatusBadge, OrderStatusBadge, TicketStatusBadge } from "@/components/shared/status-badge";
import { FormSection } from "@/components/shared/admin-primitives";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/forms/fields";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/format";

function CustomerStatusBadge({ status }: { status: AdminCustomer["status"] }) {
  if (status === "active") return <StatusBadge tone="success" icon={ShieldCheck}>Active</StatusBadge>;
  if (status === "suspended") return <StatusBadge tone="error" icon={ShieldOff}>Suspended</StatusBadge>;
  return <StatusBadge tone="warning" icon={ShieldQuestion}>Pending</StatusBadge>;
}

export function CustomerDetailView({
  customer,
  attributedOrders,
  relatedTickets,
}: {
  customer: AdminCustomer;
  attributedOrders: OrderSummary[];
  relatedTickets: SupportTicket[];
}) {
  const basePath = useConsolePath();
  const { toast } = useToast();
  const router = useRouter();
  const [status, setStatus] = useState<AdminCustomer["status"]>(customer.status);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const isSuspended = status === "suspended";

  const applyStatus = useCallback(
    async (next: "active" | "suspended") => {
      setBusy(true);
      try {
        await adminService.updateCustomer(customer.id, {
          status: next,
          reason: reason.trim() || undefined,
        });
        setStatus(next);
        setDialogOpen(false);
        setReason("");
        toast({
          title: next === "suspended" ? "Account suspended" : "Account reactivated",
          description:
            next === "suspended"
              ? `${customer.name} can no longer sign in — the change is written to the account record.`
              : `${customer.name} can sign in again.`,
        });
        // Keep the server-rendered bundle (orders, tickets) in sync.
        router.refresh();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setBusy(false);
      }
    },
    [customer.id, customer.name, reason, router, toast]
  );

  return (
    <div className="space-y-6">
      <PrototypeNotice>
        Customer detail reads live records — profile, attributed orders and linked tickets come straight from the
        database. Suspend / reactivate writes to the account record via the customers API.
      </PrototypeNotice>

      {/* Profile */}
      <FormSection title="Profile" description="Identity fields as stored in the customer record.">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-violet-glow/25 to-ice/15 font-display text-lg font-bold text-foreground" aria-hidden="true">
              {customer.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">{customer.name}</h2>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
            </div>
          </div>
          <CustomerStatusBadge status={status} />
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Customer ID</dt>
            <dd className="mt-1 font-mono text-[0.82rem] text-foreground">{customer.id}</dd>
          </div>
          <div>
            <dt className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Joined</dt>
            <dd className="mt-1 text-foreground">{formatDate(customer.joinedAt)}</dd>
          </div>
          <div>
            <dt className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Lifetime orders</dt>
            <dd className="mt-1 text-foreground">{customer.ordersCount}</dd>
          </div>
        </dl>
      </FormSection>

      {/* Privacy request */}
      <FormSection title="Privacy requests" description="Data-access and deletion requests surfaced on this customer record.">
        {customer.privacyRequest ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-foreground/[0.02] p-4">
            <div className="flex items-start gap-3">
              <FileClock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {customer.privacyRequest === "access" ? "Data-access request open" : "Deletion request open"}
                </p>
                <p className="mt-0.5 text-[0.8rem] text-muted-foreground">
                  SLA clock, fulfilment and export steps are not automated yet. Current state: open.
                </p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex rounded-xl">
                  <Button variant="outline" disabled aria-describedby={undefined}>
                    Mark as processed
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Request processing is not automated yet</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No open privacy requests on this record.</p>
        )}
      </FormSection>

      {/* Orders mini-list */}
      <FormSection
        title="Orders"
        description="Orders placed by this customer."
      >
        {attributedOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders placed by this customer yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-foreground/[0.02]">
            {attributedOrders.map((o) => (
              <li key={o.reference} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link
                    href={`${basePath}/orders/${o.reference}`}
                    className="font-mono text-[0.82rem] font-medium text-foreground underline-offset-4 hover:text-violet-soft hover:underline"
                  >
                    {o.reference}
                  </Link>
                  <p className="mt-0.5 text-[0.78rem] text-muted-foreground">
                    {o.itemsPreview.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">{o.totalLabel}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-2 text-[0.75rem] text-muted-foreground">
          <Package className="size-3.5" aria-hidden="true" />
          Orders are attributed by customer account — references and totals come from the orders database.
        </p>
      </FormSection>

      {/* Support tickets mini-list */}
      <FormSection
        title="Support tickets"
        description="Tickets linked to this customer's account or requester email."
      >
        {relatedTickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets matched this customer yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-foreground/[0.02]">
            {relatedTickets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link
                    href={`${basePath}/support/${t.id}`}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:text-violet-soft hover:underline"
                  >
                    {t.subject}
                  </Link>
                  <p className="mt-0.5 font-mono text-[0.74rem] text-muted-foreground">
                    {t.reference} · updated {formatDateTime(t.updatedAt)}
                  </p>
                </div>
                <TicketStatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-2 text-[0.75rem] text-muted-foreground">
          <LifeBuoy className="size-3.5" aria-hidden="true" />
          Tickets are matched by account id or requester email in the database.
        </p>
      </FormSection>

      {/* Danger zone */}
      <section className="rounded-2xl border border-error/30 bg-error/[0.04] p-5 sm:p-6" aria-labelledby="danger-zone-heading">
        <h2 id="danger-zone-heading" className="font-display text-[1.02rem] font-semibold text-error">
          Danger zone
        </h2>
        <p className="mt-1 text-[0.82rem] text-muted-foreground">
          {isSuspended
            ? "This account is suspended — the customer cannot sign in, place orders or use saved items."
            : "Suspending writes to the account record immediately: sign-in is blocked and the status is audited. Staff accounts are managed through Users, not here."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isSuspended ? (
            <>
              <StatusBadge tone="error" icon={ShieldOff}>Account suspended</StatusBadge>
              <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Reactivate account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reactivate {customer.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The customer regains access to their account, orders and saved items. The change is written to
                      the account record immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-success text-white hover:bg-success/90"
                      disabled={busy}
                      onClick={(e) => {
                        e.preventDefault();
                        void applyStatus("active");
                      }}
                    >
                      {busy ? "Reactivating…" : "Confirm reactivation"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Ban className="size-4" aria-hidden="true" />
                  Suspend account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspend {customer.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The customer loses access to their account and saved items. This writes to the account record
                    immediately and is recorded in the audit log. Staff accounts cannot be suspended here.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-2">
                  <label htmlFor="suspend-reason" className="text-[0.78rem] font-medium text-foreground">
                    Reason (optional — stored with the audit entry)
                  </label>
                  <TextInput
                    id="suspend-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Chargeback investigation"
                    maxLength={200}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-error text-white hover:bg-error/90"
                    disabled={busy}
                    onClick={(e) => {
                      e.preventDefault();
                      void applyStatus("suspended");
                    }}
                  >
                    {busy ? "Suspending…" : "Confirm suspension"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </section>
    </div>
  );
}
