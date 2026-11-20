"use client";

import { WhatsAppIcon } from "./whatsapp-icon";
import { cn } from "@/lib/utils";

/**
 * WhatsAppOrderButton — the shared "take this order to WhatsApp" CTA.
 *
 * Green-tinged chip that opens wa.me with a pre-filled message.
 * Used on the cart, checkout and order-confirmation surfaces so the
 * conversational ordering channel is one tap away everywhere an order
 * exists.
 */
export function WhatsAppOrderButton({
  onOpen,
  label,
  disabled = false,
  className,
}: {
  onOpen: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className={cn(
        "group inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full border border-[#25d366]/40 bg-[#25d366]/[0.08] px-6 text-sm font-semibold uppercase tracking-[0.06em] text-[#15803d]",
        "transition-[border-color,background-color,transform]",
        "hover:border-[#25d366]/70 hover:bg-[#25d366]/[0.14] hover:-translate-y-0.5",
        "focus-visible:outline-[#25d366]",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <WhatsAppIcon className="size-4 shrink-0 transition-transform group-hover:scale-110" />
      {label}
    </button>
  );
}
