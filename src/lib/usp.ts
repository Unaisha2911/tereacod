/**
 * TereaCOD — storefront USP lines.
 *
 * The ordering promises shown across the storefront (product page, cart,
 * checkout, homepage, footer, origin pages). Single source of truth so the
 * wording never drifts between surfaces — the free-delivery threshold here
 * must match DEFAULT_DELIVERY_CONFIG.freeThresholdFils in
 * src/server/repos/settings.ts (AED 300).
 */

export const USP_FREE_DELIVERY = "Free delivery at AED 300+";
export const USP_ONE_HOUR_DELIVERY = "1-hour delivery";
export const USP_PAYMENT = "Cash or card on delivery";

/** The full trio as one line: "Free delivery at AED 300+ · 1-hour delivery · Cash or card on delivery". */
export const USP_LINE = `${USP_FREE_DELIVERY} · ${USP_ONE_HOUR_DELIVERY} · ${USP_PAYMENT}`;
