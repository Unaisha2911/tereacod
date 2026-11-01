"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConsolePath } from "@/components/shared/console-path";
import { ArrowLeft, Lock, Send } from "lucide-react";
import type { SupportTicket, TicketPriority, TicketStatus } from "@/types";
import { supportService } from "@/services/support";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/shared/status-badge";
import { FormSection } from "@/components/shared/admin-primitives";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { FormField, Select, TextArea } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

function MessageBubble({ author, role, body, at }: { author: string; role: "customer" | "agent" | "system"; body: string; at: string }) {
  if (role === "system") {
    return (
      <li className="py-1 text-center">
        <p className="mx-auto inline-block rounded-full border border-line bg-foreground/[0.03] px-3 py-1 text-[0.72rem] text-muted-foreground">
          {body} · {formatDateTime(at)}
        </p>
      </li>
    );
  }
  const isAgent = role === "agent";
  return (
    <li className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3",
          isAgent ? "border-violet-glow/30 bg-violet-glow/[0.09]" : "border-line bg-elevated/60"
        )}
      >
        <p className="flex flex-wrap items-baseline gap-x-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em]">
          <span className={isAgent ? "text-violet-soft" : "text-ice"}>{author}</span>
          <span className="font-normal normal-case tracking-normal text-muted-foreground">{formatDateTime(at)}</span>
        </p>
        <p className="mt-1.5 text-[0.88rem] leading-relaxed text-foreground">{body}</p>
      </div>
    </li>
  );
}

export function TicketDetailView({ ticket }: { ticket: SupportTicket }) {
  const basePath = useConsolePath();
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [reply, setReply] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const internalNotes = ticket.internalNotes ?? [];

  // The server may auto-move status (open → pending) after a reply; keep the
  // local controls in sync when a router.refresh() delivers updated props.
  // (Mandated by the QA audit fix — the props-change sync is intentional.)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(ticket.status);
    setPriority(ticket.priority);
  }, [ticket.status, ticket.priority]);

  const onSendReply = useCallback(() => {
    if (!reply.trim() || pending) return;
    const body = reply.trim();
    startTransition(async () => {
      try {
        await supportService.reply(ticket.id, body, false);
        setReply("");
        toast({
          title: "Reply sent",
          description: "Your reply was added to the ticket thread and the customer notification was queued.",
        });
        router.refresh();
      } catch (error) {
        toast({
          title: "Reply not sent",
          description: error instanceof Error ? error.message : "The reply could not be delivered. Try again.",
        });
      }
    });
  }, [reply, pending, ticket.id, toast, router]);

  const onAddNote = useCallback(() => {
    if (!noteDraft.trim() || pending) return;
    const body = noteDraft.trim();
    startTransition(async () => {
      try {
        await supportService.reply(ticket.id, body, true);
        setNoteDraft("");
        toast({ title: "Internal note added", description: "The note was saved to the ticket record — visible to staff only." });
        router.refresh();
      } catch (error) {
        toast({
          title: "Note not saved",
          description: error instanceof Error ? error.message : "The note could not be saved. Try again.",
        });
      }
    });
  }, [noteDraft, pending, ticket.id, toast, router]);

  const onStatusChange = useCallback(
    (next: string) => {
      const previous = status;
      setStatus(next as TicketStatus);
      startTransition(async () => {
        try {
          await supportService.update(ticket.id, { status: next as TicketStatus });
          toast({ title: "Status updated", description: `Ticket moved to "${STATUS_LABEL[next as TicketStatus]}" — the change is saved and audited.` });
          router.refresh();
        } catch (error) {
          setStatus(previous);
          toast({
            title: "Status not saved",
            description: error instanceof Error ? error.message : "The status change could not be saved.",
          });
        }
      });
    },
    [status, ticket.id, toast, router]
  );

  const onPriorityChange = useCallback(
    (next: string) => {
      const previous = priority;
      setPriority(next as TicketPriority);
      startTransition(async () => {
        try {
          await supportService.update(ticket.id, { priority: next as TicketPriority });
          toast({ title: "Priority updated", description: `Priority set to "${PRIORITY_LABEL[next as TicketPriority]}" — the change is saved and audited.` });
          router.refresh();
        } catch (error) {
          setPriority(previous);
          toast({
            title: "Priority not saved",
            description: error instanceof Error ? error.message : "The priority change could not be saved.",
          });
        }
      });
    },
    [priority, ticket.id, toast, router]
  );

  return (
    <div className="space-y-6">
      <Link
        href={basePath + "/support"}
        className="inline-flex items-center gap-2 text-[0.82rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to support
      </Link>

      <PrototypeNotice>
        Live ticket thread from the support queue — replies, notes and queue controls save to the ticket record.
      </PrototypeNotice>

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="font-mono text-[0.78rem] text-violet-soft">{ticket.reference}</p>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">{ticket.subject}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {ticket.requester} · {ticket.category} · opened {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <TicketStatusBadge status={status} />
          <TicketPriorityBadge priority={priority} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Thread */}
          <FormSection title="Conversation" description="Messages between the customer and support agents.">
            <ul className="space-y-3" aria-label="Ticket message thread">
              {ticket.messages.map((m) => (
                <MessageBubble key={m.id} author={m.author} role={m.role} body={m.body} at={m.at} />
              ))}
            </ul>
          </FormSection>

          {/* Reply composer */}
          <FormSection title="Reply" description="Your reply joins the thread and the customer notification is queued for delivery.">
            <FormField label="Reply message" htmlFor="ticket-reply">
              <TextArea
                id="ticket-reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Draft a reply to the customer…"
                rows={4}
              />
            </FormField>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[0.75rem] text-muted-foreground">The reply is saved to the ticket and queued for email delivery.</p>
              <Button onClick={onSendReply} disabled={!reply.trim() || pending}>
                <Send className="size-4" aria-hidden="true" />
                Send reply
              </Button>
            </div>
          </FormSection>
        </div>

        <div className="space-y-6">
          {/* Internal notes */}
          <section
            className="rounded-2xl border border-warning/35 bg-warning/[0.05] p-5"
            aria-labelledby="internal-notes-heading"
          >
            <div className="flex items-center gap-2">
              <Lock className="size-4 shrink-0 text-warning" aria-hidden="true" />
              <h2 id="internal-notes-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
                Internal notes
              </h2>
            </div>
            <p className="mt-1 text-[0.78rem] font-medium uppercase tracking-[0.12em] text-warning">
              Internal — never shown to customer
            </p>
            {internalNotes.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No internal notes yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {internalNotes.map((n) => (
                  <li key={n.id} className="rounded-xl border border-warning/25 bg-abyss/60 px-3.5 py-3">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-warning">
                      {n.author} · {formatDateTime(n.at)}
                    </p>
                    <p className="mt-1 text-[0.84rem] leading-relaxed text-foreground">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 space-y-2.5">
              <label htmlFor="internal-note" className="sr-only">
                New internal note
              </label>
              <TextArea
                id="internal-note"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add an internal note…"
                rows={3}
              />
              <Button variant="outline" onClick={onAddNote} disabled={!noteDraft.trim() || pending} className="w-full">
                Add internal note
              </Button>
            </div>
          </section>

          {/* Controls */}
          <FormSection title="Queue controls" description="Status and priority changes are saved to the ticket record and written to the audit log.">
            <div className="space-y-4">
              <FormField label="Status" htmlFor="ticket-status" hint="Saved to the ticket record.">
                <Select id="ticket-status" value={status} onChange={(e) => onStatusChange(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </Select>
              </FormField>
              <FormField label="Priority" htmlFor="ticket-priority" hint="Saved to the ticket record.">
                <Select id="ticket-priority" value={priority} onChange={(e) => onPriorityChange(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </FormField>
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}
