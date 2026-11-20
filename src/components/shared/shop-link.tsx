import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * SHOP LINK — storefront-wide <Link> with prefetch DISABLED by default.
 * ---------------------------------------------------------------------------
 *
 * WHY EVERY STOREFRONT LINK OPTS OUT OF PREFETCH:
 *
 * The deployment target is Cloudflare Workers on the FREE plan. Every page
 * renders `force-dynamic` (see (site)/layout.tsx), so there is no static
 * payload to prefetch — each automatic viewport prefetch renders the route's
 * shell LIVE on a Worker. The storefront chrome alone (header nav, footer
 * columns, homepage section cards, origin grid, bottom nav) puts dozens of
 * <Link>s into the viewport on a single home-page visit; with default
 * prefetch every one of them fired an RSC request the moment it scrolled
 * into view. One visit to "/" silently produced 30-50 Worker invocations for
 * routes the visitor never opened — which is exactly the "visiting the home
 * page calls all the other pages/APIs" behaviour, and on the free plan it
 * burned the daily request quota and pushed busy bursts past the CPU limit
 * (error 1102 → "something went wrong" screens).
 *
 * Navigation cost without prefetch is one RSC fetch ON CLICK; every route
 * has a loading.tsx skeleton, so the perceived delay is the skeleton frame,
 * not a blank screen. The item-card links have worked this way since the
 * first quota audit (see components/shared/item-card.tsx) — this wrapper
 * extends the same policy to the rest of the chrome so the default is safe
 * everywhere and call sites stay one-line imports.
 *
 * USAGE:
 *   import { Link } from "@/components/shared/shop-link";
 *   … <Link href="/cart">Cart</Link>        // prefetch OFF
 *   … <Link href="/x" prefetch>…</Link>     // explicit opt-in still possible
 *
 * Props are identical to next/link; only the prefetch default changes.
 */
export type ShopLinkProps = Omit<ComponentProps<typeof NextLink>, "prefetch"> & {
  /** Overrides the prefetch-off default (leave undefined for the safe default). */
  prefetch?: boolean;
};

export function Link({ prefetch, ...props }: ShopLinkProps) {
  return <NextLink {...props} prefetch={prefetch ?? false} />;
}

export default Link;
