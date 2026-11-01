import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { LifeBuoy } from "lucide-react";
import { getSettings } from "@/server/data";

export const metadata: Metadata = {
  robots: { index: false, follow: true }, title: "Scheduled maintenance" };

/** Maintenance state — template for planned downtime. */
export default async function MaintenancePage() {
  const settings = await getSettings();

  return (
    <PageContainer width="narrow" className="flex min-h-[70svh] flex-col items-center justify-center py-20 text-center">
      <p className="text-label font-semibold uppercase tracking-[0.24em] text-ice">Scheduled maintenance</p>
      <h1 className="mt-4 text-display font-bold text-foreground">We&apos;re briefly offline</h1>
      <p className="mx-auto mt-6 max-w-lg text-lead text-muted-foreground">
        TereaCOD is undergoing planned maintenance. Everything will be back shortly — thank you for your patience.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
        >
          Check again
        </Link>
        <a
          href={`mailto:${settings.contact.supportEmail}`}
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50"
        >
          <LifeBuoy className="size-4" aria-hidden="true" />
          Contact support
        </a>
      </div>
    </PageContainer>
  );
}
