"use client";

import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { buildWhatsAppLink, composeSupportMessage, getWhatsAppNumber, onWhatsAppNumberChange } from "@/services/whatsapp";
import { cn } from "@/lib/utils";

/**
 * FloatingWhatsAppButton — fixed bottom-right conversational-commerce CTA.
 *
 * Renders on every public storefront page ((site) layout) but never inside
 * the admin console. The wa.me target comes from the KV-backed site
 * settings: AppBootstrap hydrates the number once per session; this button
 * subscribes to that change so the link is always current, and until then
 * it falls back to the compiled-in default.
 *
 * Positioning sits above the mobile bottom navigation (h ≈ 3.5rem) and
 * respects the iOS safe-area inset; on ≥md screens it docks to the corner.
 */
export function FloatingWhatsAppButton() {
  const [number, setNumber] = useState(getWhatsAppNumber());

  useEffect(() => onWhatsAppNumberChange(setNumber), []);

  const href = buildWhatsAppLink(composeSupportMessage());

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with us on WhatsApp (${number})`}
      className={cn(
        "group fixed right-4 z-[60] flex size-14 items-center justify-center rounded-full",
        "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6",
        "bg-[#25d366] text-white",
        "shadow-[0_8px_28px_rgba(37,211,102,0.45),0_2px_8px_rgba(0,0,0,0.35)]",
        "transition-transform duration-200 hover:scale-110 focus-visible:scale-110",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25d366]",
        "motion-reduce:transition-none motion-reduce:hover:scale-100"
      )}
    >
      {/* Soft ping ring — draws attention without stealing focus. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25d366]/35 motion-reduce:animate-none"
      />
      <WhatsAppIcon className="size-7" />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full border border-line bg-elevated px-3.5 py-1.5 text-[0.78rem] font-medium text-foreground opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:block">
        Order on WhatsApp
      </span>
    </a>
  );
}
