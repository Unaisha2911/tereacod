/**
 * TereaCOD — storefront USP lines.
 *
 * The ordering promises shown across the storefront (announcement bar,
 * product page, cart, checkout, homepage, footer, origin pages). Single
 * source of truth so the wording never drifts between surfaces — the
 * free-delivery threshold here must match
 * DEFAULT_DELIVERY_CONFIG.freeThresholdFils in
 * src/server/repos/settings.ts (AED 300).
 */

export const USP_FREE_DELIVERY = "Free Delivery AED 300+";
/** The headline promise — visually emphasized wherever the trio renders. */
export const USP_ONE_HOUR_DELIVERY = "1-Hour Delivery";
export const USP_PAYMENT = "Cash or Card Payment";

/** The full trio as one line: "Free Delivery AED 300+ · 1-Hour Delivery · Cash or Card Payment". */
export const USP_LINE = `${USP_FREE_DELIVERY} · ${USP_ONE_HOUR_DELIVERY} · ${USP_PAYMENT}`;
