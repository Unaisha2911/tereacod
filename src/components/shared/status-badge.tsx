import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, PackageCheck, PackageX, Truck, XCircle, FileWarning, FileCheck2, Hourglass } from "lucide-react";
import type { Availability, ComplianceRecord, OrderStatus, TicketPriority, TicketStatus } from "@/types";

type Tone = "neutral" | "violet" | "success" | "warning" | "error" | "ice";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-line-strong bg-foreground/[0.05] text-muted-foreground",
  violet: "border-violet-glow/35 bg-violet-glow/12 text-violet-soft",
  success: "border-success/35 bg-success/10 text-success",
  warning: "border-warning/35 bg-warning/10 text-warning",
  error: "border-error/35 bg-error/10 text-error",
  ice: "border-ice/35 bg-ice/10 text-ice",
};

/** StatusBadge — tone + icon + text (never color-only). */
export function StatusBadge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-medium tracking-wide", TONE_CLASSES[tone], className)}>
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

const ORDER_STATUS_MAP: Record<OrderStatus, { tone: Tone; label: string; icon?: React.ComponentType<{ className?: string }> }> = {
  placed: { tone: "neutral", label: "Placed", icon: Clock },
  confirmed: { tone: "violet", label: "Confirmed", icon: CheckCircle2 },
  processing: { tone: "violet", label: "Processing", icon: Hourglass },
  packed: { tone: "violet", label: "Packed", icon: PackageCheck },
  shipped: { tone: "ice", label: "Shipped", icon: Truck },
  delivered: { tone: "success", label: "Delivered", icon: CheckCircle2 },
  cancelled: { tone: "error", label: "Cancelled", icon: XCircle },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = ORDER_STATUS_MAP[status];
  return (
    <StatusBadge tone={cfg.tone} icon={cfg.icon}>
      {cfg.label}
    </StatusBadge>
  );
}

const AVAILABILITY_MAP: Record<Availability, { tone: Tone; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  in_stock: { tone: "success", label: "Available", icon: PackageCheck },
  low_stock: { tone: "warning", label: "Low stock", icon: Hourglass },
  out_of_stock: { tone: "error", label: "Out of stock", icon: PackageX },
  unavailable: { tone: "neutral", label: "Unavailable", icon: PackageX },
};

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  const cfg = AVAILABILITY_MAP[availability];
  return (
    <StatusBadge tone={cfg.tone} icon={cfg.icon}>
      {cfg.label}
    </StatusBadge>
  );
}

const TICKET_STATUS_TONE: Record<TicketStatus, Tone> = { open: "violet", pending: "warning", resolved: "success", closed: "neutral" };
const TICKET_PRIORITY_TONE: Record<TicketPriority, Tone> = { low: "neutral", normal: "ice", high: "warning", urgent: "error" };

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <StatusBadge tone={TICKET_STATUS_TONE[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</StatusBadge>;
}
export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <StatusBadge tone={TICKET_PRIORITY_TONE[priority]}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</StatusBadge>;
}

const COMPLIANCE_MAP: Record<ComplianceRecord["status"], { tone: Tone; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  verified: { tone: "success", label: "Verified", icon: FileCheck2 },
  pending: { tone: "warning", label: "Pending review", icon: Hourglass },
  missing: { tone: "error", label: "Missing", icon: FileWarning },
  expired: { tone: "error", label: "Expired", icon: FileWarning },
};

export function ComplianceStatusBadge({ status }: { status: ComplianceRecord["status"] }) {
  const cfg = COMPLIANCE_MAP[status];
  return (
    <StatusBadge tone={cfg.tone} icon={cfg.icon}>
      {cfg.label}
    </StatusBadge>
  );
}

