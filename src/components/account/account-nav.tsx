"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bookmark,
  CircleUserRound,
  Fingerprint,
  IdCard,
  Lock,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/services/account";
import { cn } from "@/lib/utils";

/**
 * AccountNav — shared account chrome.
 * Desktop: vertical card nav (sticky below the header).
 * Mobile: horizontally scrollable chip row.
 * Active state is path-derived (exact for /account, prefix for children).
 *
 * Profile data comes from the auth store (hydrated by the app bootstrap
 * provider from /api/v1/auth/session). Signed-out visitors see a sign-in
 * prompt card — the account pages themselves are server-gated.
 */

const ACCOUNT_LINKS = [
  { href: "/account", label: "Overview", icon: CircleUserRound, exact: true },
  { href: "/account/profile", label: "Profile", icon: IdCard, exact: false },
  { href: "/account/verify", label: "Verify identity", icon: Fingerprint, exact: false },
  { href: "/account/security", label: "Security", icon: ShieldCheck, exact: false },
  { href: "/account/preferences", label: "Preferences", icon: SlidersHorizontal, exact: false },
  { href: "/account/saved", label: "Saved items", icon: Bookmark, exact: false },
  { href: "/account/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { href: "/account/privacy", label: "Privacy", icon: Lock, exact: false },
] as const;

function linkIsActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

const VERIFICATION_LABEL = {
  verified: "Verified",
  pending: "Verification pending",
  unverified: "Not verified",
} as const;

export function AccountNav() {
  const pathname = usePathname();
  const user = useAuth((state) => state.user);

  return (
    <nav aria-label="Account sections">
      {/* Profile mini-header — real session, or a sign-in prompt for guests */}
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-elevated/50 p-4">
        {user ? (
          <>
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-glow to-ice font-display text-sm font-bold text-[#0b0713]"
            >
              {user.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-[0.95rem] font-semibold text-foreground">{user.displayName}</p>
              <p
                className={cn(
                  "mt-0.5 inline-flex items-center gap-1 text-[0.72rem] font-medium",
                  user.verification === "verified" ? "text-success" : "text-warning"
                )}
              >
                <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
                {VERIFICATION_LABEL[user.verification]}
              </p>
            </div>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-elevated text-muted-foreground"
            >
              <CircleUserRound className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-[0.95rem] font-semibold text-foreground">Your account</p>
              <Link
                href="/account/sign-in"
                className="mt-0.5 inline-flex items-center gap-1 text-[0.72rem] font-medium text-violet-soft transition-colors hover:text-foreground"
              >
                Sign in to manage orders and saved items
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Mobile: horizontal chip row */}
      <ul className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:hidden">
        {ACCOUNT_LINKS.map((link) => {
          const active = linkIsActive(pathname, link.href, link.exact);
          const Icon = link.icon;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[0.82rem] font-medium transition-colors",
                  active
                    ? "border-violet-glow/40 bg-violet-glow/15 text-foreground"
                    : "border-line bg-elevated/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop: vertical card nav */}
      <ul className="mt-4 hidden flex-col gap-1 rounded-2xl border border-line bg-elevated/50 p-2 lg:flex lg:sticky lg:top-24">
        {ACCOUNT_LINKS.map((link) => {
          const active = linkIsActive(pathname, link.href, link.exact);
          const Icon = link.icon;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl border px-3.5 text-sm font-medium transition-colors",
                  active
                    ? "border-violet-glow/40 bg-violet-glow/15 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-line hover:bg-foreground/[0.03] hover:text-foreground"
                )}
              >
                <Icon className={cn("size-[1.05rem] shrink-0", active ? "text-violet-soft" : "text-muted-foreground")} aria-hidden="true" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
