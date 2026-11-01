"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Gauge,
  IdCard,
  LifeBuoy,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { formatDate, formatItemsPreview } from "@/lib/format";
import { accountService, useAuth } from "@/services/account";
import { orderHistoryService } from "@/services/orders";
import { useSavedItems } from "@/services/saved-items";
import type { OrderSummary, Paginated, UserProfile } from "@/types";
import { cn } from "@/lib/utils";

type OrdersState =
  | { state: "loading" }
  | { state: "success"; data: Paginated<OrderSummary> }
  | { state: "error" };

type ProfileState =
  | { state: "loading" }
  | { state: "success"; profile: UserProfile }
  | { state: "error" };

/** Time-aware greeting — computed after mount so SSR/client markup matches. */
function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const QUICK_LINKS = [
  { href: "/account/profile", label: "Profile", icon: IdCard },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
  { href: "/account/preferences", label: "Preferences", icon: SlidersHorizontal },
  { href: "/help", label: "Help centre", icon: LifeBuoy },
] as const;

// min-w-0 keeps every card shrinkable inside responsive grid tracks
const cardShell = "min-w-0 rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6";

const emptySubscribe = () => () => {};

export function OverviewView() {
  // Time-aware greeting — client snapshot computed after hydration;
  // the server snapshot renders a neutral fallback, so markup matches.
  const greeting = useSyncExternalStore(emptySubscribe, () => greetingForHour(new Date().getHours()), () => null);
  const isStaff = useAuth((s) => s.isStaff);
  const [orders, setOrders] = useState<OrdersState>({ state: "loading" });
  const [retryCount, setRetryCount] = useState(0);
  const [profile, setProfile] = useState<ProfileState>({ state: "loading" });
  const [profileRetry, setProfileRetry] = useState(0);
  const [sessionsCount, setSessionsCount] = useState<number | null>(null);
  const savedItems = useSavedItems((s) => s.items);

  useEffect(() => {
    let cancelled = false;
    orderHistoryService
      .list({ pageSize: 2 })
      .then((data) => {
        if (!cancelled) setOrders({ state: "success", data });
      })
      .catch(() => {
        if (!cancelled) setOrders({ state: "error" });
      });
    accountService
      .sessions()
      .then((sessions) => {
        if (!cancelled) setSessionsCount(sessions.length);
      })
      .catch(() => {
        if (!cancelled) setSessionsCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  // Profile loads through the account service — same loading/error
  // pattern as the profile view.
  useEffect(() => {
    let cancelled = false;
    accountService
      .getProfile()
      .then((loaded) => {
        if (!cancelled) setProfile({ state: "success", profile: loaded });
      })
      .catch(() => {
        if (!cancelled) setProfile({ state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [profileRetry]);

  const retryOrders = () => {
    setOrders({ state: "loading" });
    setRetryCount((count) => count + 1);
  };

  const retryProfile = () => {
    setProfile({ state: "loading" });
    setProfileRetry((count) => count + 1);
  };

  if (profile.state === "loading") {
    return (
      <div className="rounded-2xl border border-line bg-elevated/50 p-6">
        <LoadingIndicator label="Loading your account" />
      </div>
    );
  }

  if (profile.state === "error") {
    return (
      <ErrorState
        title="Account unavailable"
        body="Your account could not be loaded. Please try again."
        retryLabel="Retry"
        onRetry={retryProfile}
      />
    );
  }

  const user = profile.profile;
  const firstName = user.displayName.split(" ")[0];

  // Contextual quick links: the staff console for staff sessions — one
  // unified login sends staff straight to /admin.
  const contextualLinks = [
    ...(isStaff ? [{ href: "/admin", label: "Staff console", icon: Gauge }] : []),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-h2 font-bold text-foreground">
          {greeting ? `${greeting}, ${firstName}` : `Welcome back, ${firstName}`}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {user.email} — encrypted session, synced across devices.
        </p>
      </div>

      {/* grid-cols-1 (minmax(0,1fr)) — a bare auto track would let the
          Recent orders card's nowrap content widen the page on mobile. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Profile summary */}
        <section className={cardShell} aria-labelledby="overview-profile-heading">
          <h3 id="overview-profile-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
            Profile
          </h3>
          <div className="mt-4 flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-glow to-ice font-display text-base font-bold text-[#0b0713]"
            >
              {user.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-[0.95rem] font-semibold text-foreground">{user.displayName}</p>
              <p className="mt-0.5 truncate text-[0.82rem] text-muted-foreground">{user.email}</p>
              <p className="mt-0.5 text-[0.78rem] text-muted-foreground">Member since {formatDate(user.joinedAt)}</p>
            </div>
          </div>
          <Link
            href="/account/profile"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
          >
            Edit profile
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        {/* Security snapshot */}
        <section className={cardShell} aria-labelledby="overview-security-heading">
          <h3 id="overview-security-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
            Security
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Verification</dt>
              <dd>
                <span className="inline-flex items-center gap-1.5 text-success">
                  <BadgeCheck className="size-4" aria-hidden="true" />
                  {user.verification === "verified" ? "Verified" : "Not verified"}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Active sessions</dt>
              <dd className="font-medium text-foreground" aria-live="polite">
                {sessionsCount === null ? <span className="text-muted-foreground">—</span> : sessionsCount}
              </dd>
            </div>
          </dl>
          <Link
            href="/account/security"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
          >
            Manage security
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        {/* Saved items */}
        <section className={cardShell} aria-labelledby="overview-saved-heading">
          <h3 id="overview-saved-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
            Saved items
          </h3>
          <p className="mt-4 font-display text-3xl font-bold text-foreground">{savedItems.length}</p>
          <p className="mt-1 text-[0.78rem] text-muted-foreground">
            Synced to your account — the same list follows you on every signed-in device.
          </p>
          <Link
            href="/account/saved"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
          >
            View saved items
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        {/* Recent orders */}
        <section className={cardShell} aria-labelledby="overview-orders-heading">
          <div className="flex items-center justify-between gap-3">
            <h3 id="overview-orders-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
              Recent orders
            </h3>
            <Link
              href="/account/orders"
              className="inline-flex min-h-9 items-center gap-1 text-[0.82rem] font-medium text-violet-soft transition-colors hover:text-foreground"
            >
              View all
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4">
            {orders.state === "loading" && (
              <div className="space-y-2" aria-hidden="true">
                <div className="skeleton-sheen h-14 rounded-xl bg-foreground/[0.03]" />
                <div className="skeleton-sheen h-14 rounded-xl bg-foreground/[0.03]" />
              </div>
            )}

            {orders.state === "error" && (
              <ErrorState
                title="Orders unavailable"
                body="Your orders could not be loaded. Please try again."
                retryLabel="Retry"
                onRetry={retryOrders}
                className="py-8"
              />
            )}

            {orders.state === "success" && orders.data.items.length === 0 && (
              <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted-foreground">
                No orders yet.
              </p>
            )}

            {orders.state === "success" && orders.data.items.length > 0 && (
              <ul className="space-y-2">
                {orders.data.items.map((order) => (
                  <li key={order.reference}>
                    <Link
                      href={`/account/orders/${order.reference}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-violet-glow/40 hover:bg-foreground/[0.03]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[0.82rem] text-foreground">{order.reference}</p>
                        <p
                          className="mt-0.5 truncate text-[0.75rem] text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {formatDate(order.placedAt)} · {formatItemsPreview(order.itemsPreview, order.itemCount)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <OrderStatusBadge status={order.status} />
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Quick links */}
      <section className={cardShell} aria-labelledby="overview-quick-heading">
        <h3 id="overview-quick-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Quick links
        </h3>
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {[...contextualLinks, ...QUICK_LINKS].map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={cn(
                    "group flex min-h-11 items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 text-sm",
                    "text-muted-foreground transition-colors hover:border-violet-glow/40 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 text-violet-soft" aria-hidden="true" />
                    {link.label}
                  </span>
                  <ArrowUpRight
                    className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-[0.75rem] text-muted-foreground">
        Orders, profile and saved items on this page come straight from your TereaCOD account.
      </p>
    </div>
  );
}
