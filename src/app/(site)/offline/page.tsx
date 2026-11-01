import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { WifiOff } from "lucide-react";
import { OfflineActions } from "./offline-actions";

export const metadata: Metadata = {
  robots: { index: false, follow: true }, title: "You're offline" };

/** Offline / unavailable state — template shown when connectivity drops. */
export default function OfflinePage() {
  return (
    <PageContainer width="narrow" className="flex min-h-[70svh] flex-col items-center justify-center py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-line bg-elevated/60">
        <WifiOff className="size-7 text-ice" aria-hidden="true" />
      </div>
      <h1 className="mt-8 text-display font-bold text-foreground">Connection lost</h1>
      <p className="mx-auto mt-6 max-w-lg text-lead text-muted-foreground">
        It looks like you&apos;re offline. Pages you have already visited may still be available — check your connection and try again.
      </p>
      <OfflineActions />
    </PageContainer>
  );
}
