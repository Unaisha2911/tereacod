import type { CartDetail, OrderDetail } from "@/types";
import { formatAED } from "@/lib/utils";

/**
 * WHATSAPP COMMERCE — conversational ordering channel.
 *
 * Builds wa.me deep links that open a WhatsApp chat pre-filled with a
 * formatted order summary. The customer's cart never leaves the device
 * until they press send in WhatsApp itself — this is a link builder,
 * not a transport. The number is a prototype placeholder managed by
 * the admin settings module.
 */

/**
 * Store WhatsApp number (UAE, digits only, with country code). The default
 * is overridden at bootstrap from the KV-backed site settings so the admin
 * settings module controls it — no redeploy needed.
 */
let currentNumber = "971500000000";
let currentDisplay = "+971 50 000 0000";

/** Subscribers notified when the number changes (settings hydration). */
const numberListeners = new Set<(number: string) => void>();

/** Subscribe to number changes — returns an unsubscribe function. */
export function onWhatsAppNumberChange(listener: (number: string) => void): () => void {
  numberListeners.add(listener);
  return () => {
    numberListeners.delete(listener);
  };
}

/** Update the number from site settings (digits extracted automatically). */
export function setWhatsAppNumber(raw: string): void {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 8) currentNumber = digits;
  currentDisplay = raw.trim() || currentDisplay;
  for (const listener of numberListeners) {
    listener(currentNumber);
  }
}

export function getWhatsAppNumber(): string {
  return currentNumber;
}

/** Human-readable number shown in the UI. */
export function getWhatsAppDisplay(): string {
  return currentDisplay;
}

/** Build a wa.me deep link with a URL-encoded message. */
export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${currentNumber}?text=${encodeURIComponent(message)}`;
}

/** Open WhatsApp in a new tab with the given message. */
export function openWhatsApp(message: string): void {
  window.open(buildWhatsAppLink(message), "_blank", "noopener,noreferrer");
}

/* --------------------------- Composers ---------------------------- */

/** Shared brand header + legal footer for every composed message. */
function frame(body: string): string {
  return `*TereaCOD — TEREA order*\n${body}\n\nSent from tereacod.ae · Adults 18+ only (UAE).`;
}

/**
 * Message for the checkout page — cart contents, totals, plus any
 * contact/address details the customer has already typed. Fields the
 * customer has not filled yet are omitted so the conversation can
 * pick them up naturally.
 */
export function composeCheckoutMessage(
  cart: CartDetail,
  total: number,
  details?: {
    fullName?: string;
    phone?: string;
    emirate?: string;
    city?: string;
    street?: string;
    deliveryMethod?: string;
    paymentMethod?: string;
    note?: string;
  }
): string {
  const lines: string[] = ["Hi TereaCOD! I'd like to place this order:"];

  const purchasable = cart.lines.filter((line) => !line.blocked);
  for (const line of purchasable) {
    const variant = line.variantLabel ? ` (${line.variantLabel})` : "";
    lines.push(`• ${line.qty}× ${line.product.name}${variant} — ${formatAED(line.lineTotal)}`);
  }

  lines.push("");
  lines.push(`Subtotal: ${formatAED(cart.totals.subtotal)}`);

  if (details?.deliveryMethod) {
    const delivery = details.deliveryMethod === "express" ? "Express (next day)" : "Standard (2–4 days)";
    lines.push(`Delivery: ${delivery}`);
  }
  lines.push(`*Total: ${formatAED(total)}*`);

  const contact: string[] = [];
  if (details?.fullName) contact.push(`Name: ${details.fullName}`);
  if (details?.phone) contact.push(`Phone: ${details.phone}`);
  if (details?.emirate || details?.city) {
    contact.push(`Address: ${[details.city, details.emirate].filter(Boolean).join(", ")}`);
  }
  if (details?.street) contact.push(`Street: ${details.street}`);
  if (details?.paymentMethod) {
    const payment =
      details.paymentMethod === "card-on-delivery"
        ? "Card on delivery"
        : details.paymentMethod === "saved-card"
          ? "Card on delivery (saved card)"
          : "Cash on delivery";
    contact.push(`Payment: ${payment}`);
  }
  if (details?.note) contact.push(`Note: ${details.note}`);

  if (contact.length > 0) {
    lines.push("");
    lines.push(...contact);
  }

  return frame(lines.join("\n"));
}

/** Message for the cart page — quick "take it from here" hand-off. */
export function composeCartMessage(cart: CartDetail): string {
  const lines: string[] = ["Hi TereaCOD! I'd like to order these items:"];

  for (const line of cart.lines.filter((l) => !l.blocked)) {
    const variant = line.variantLabel ? ` (${line.variantLabel})` : "";
    lines.push(`• ${line.qty}× ${line.product.name}${variant} — ${formatAED(line.lineTotal)}`);
  }

  lines.push("");
  lines.push(`Subtotal: ${formatAED(cart.totals.subtotal)}`);
  lines.push(`Items: ${cart.totals.itemCount}`);
  lines.push("");
  lines.push("Please help me with delivery details.");

  return frame(lines.join("\n"));
}

/** Message for the success page — confirms a placed prototype order. */
export function composeOrderConfirmationMessage(detail: OrderDetail): string {
  const lines: string[] = [
    `Hi TereaCOD! Please confirm my order *${detail.reference}*:`,
    "",
  ];

  for (const item of detail.items) {
    lines.push(`• ${item.quantity}× ${item.name} — ${item.lineTotalLabel}`);
  }

  lines.push("");
  lines.push(`Total: ${detail.totalLabel}`);
  lines.push(`Delivery: ${detail.deliveryLabel}`);
  lines.push(`Payment: ${detail.paymentLabel}`);

  return frame(lines.join("\n"));
}

/** General support message (footer / contact surfaces). */
export function composeSupportMessage(): string {
  return frame("Hi TereaCOD! I have a question about an order.");
}
