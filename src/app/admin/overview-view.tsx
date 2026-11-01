"use client";
import { useConsolePath } from "@/components/shared/console-path";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Hourglass,
  Images,
  LifeBuoy,
  Package,
  ShoppingBag,
  Upload,
  Users,
} from "lucide-react";
import { adminService, type AdminOverview } from "@/services/admin";
import { AuditLogList, StatCard } from "@/components/shared/admin-primitives";
import { ErrorState } from "@/components/shared/error-state";
import { PrototypeNotice } from "@/components/shared/prototype-notice";

/* ------------------------------ helpers --------------------------- */

function OverviewSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[7.75rem] animate-pulse rounded-2xl border border-line bg-elevated/40" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-line bg-elevated/40" />
    </div>
  );
}

function quickActions(basePath: string) {
  return [
    { label: "Upload media", hint: "Media pipeline (R2 at deploy)", href: `${basePath}/media`, icon: Upload },
    { label: "Manage products", hint: "Catalog list and product editors", href: `${basePath}/catalog/products`, icon: Package },
    { label: "Support inbox", hint: "Open and pending customer tickets", href: `${basePath}/support`, icon: LifeBuoy },
  ] as const;
}

/* ------------------------------- view ----------------------------- */

export function OverviewView() {
  const basePath = useConsolePath();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    adminService
      .overview()
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load the overview.");
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  if (error) {
    return <ErrorState body={error} onRetry={() => { setError(null); setReloadKey((k) => k + 1); }} />;
  }

  if (!data) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <h1 className="font-display text-h2 font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1.5 max-w-2xl text-[0.92rem] text-muted-foreground">
          Console overview — media, catalog, orders and support queues at a glance.
        </p>
      </header>

      <PrototypeNotice>Live console — every figure reads from the operational database in real time.</PrototypeNotice>

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Media assets" value={data.mediaAssets} hint="Products, brand and legal folders" icon={Images} tone="ice" />
        <StatCard label="Products in catalog" value={data.catalogRecords} hint="Live storefront catalog" icon={Package} />
        <StatCard label="Brands stocked" value={data.brands} hint="Storefront brand directory" icon={BadgeCheck} tone="violet" />
        <StatCard label="Customers" value={data.customers} hint="Customer records on file" icon={Users} tone="violet" />
        <StatCard label="Orders" value={data.orders} hint="Placed order summaries" icon={ShoppingBag} />
        <StatCard label="Open tickets" value={data.openTickets} hint="Open and pending support queue" icon={LifeBuoy} tone="warning" />
      </div>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <h2 className="sr-only">Quick actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions(basePath).map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-elevated/50 p-5 transition-colors hover:border-violet-glow/40"
            >
              <span className="flex items-start gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-foreground/[0.03]">
                  <action.icon className="size-[1.1rem] text-violet-soft" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[0.92rem] font-semibold text-foreground">{action.label}</span>
                  <span className="mt-0.5 block text-[0.78rem] text-muted-foreground">{action.hint}</span>
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-violet-soft"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6" aria-labelledby="recent-activity-heading">
        <h2 id="recent-activity-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Recent administrative activity
        </h2>
        <p className="mt-1 text-[0.82rem] text-muted-foreground">The five most recent audit events across the console.</p>
        <div className="mt-4">
          <AuditLogList events={data.recentActivity} />
        </div>
      </section>

      <p className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
        <Hourglass className="size-3.5 text-violet-soft" aria-hidden="true" />
        Figures recompute from the live database on every load — orders, customers and tickets accumulate as they happen.
      </p>
    </div>
  );
}
