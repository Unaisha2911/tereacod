import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Clock, LogIn } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: true }, title: "Session expired" };

/** Session-expired state — shown when an authenticated period ends. */
export default function SessionExpiredPage() {
  return (
    <PageContainer width="narrow" className="flex min-h-[70svh] flex-col items-center justify-center py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-line bg-elevated/60">
        <Clock className="size-7 text-violet-soft" aria-hidden="true" />
      </div>
      <h1 className="mt-8 text-display font-bold text-foreground">Your session has ended</h1>
      <p className="mx-auto mt-6 max-w-lg text-lead text-muted-foreground">
        For your security, sessions end after a period of inactivity. Sign in again to continue where you left off.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/account/sign-in"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
        >
          <LogIn className="size-4" aria-hidden="true" />
          Sign in again
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50"
        >
          Back to homepage
        </Link>
      </div>
    </PageContainer>
  );
}
