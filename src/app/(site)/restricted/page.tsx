import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { ShieldX, Lock, UserRound } from "lucide-react";
import { PrototypeNotice } from "@/components/shared/prototype-notice";

export const metadata: Metadata = {
  robots: { index: false, follow: true }, title: "Access restricted" };

/** Access-restricted state — for areas requiring role authorization. */
export default function RestrictedPage() {
  return (
    <PageContainer width="narrow" className="flex min-h-[70svh] flex-col items-center justify-center py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-warning/30 bg-warning/10">
        <ShieldX className="size-7 text-warning" aria-hidden="true" />
      </div>
      <h1 className="mt-8 text-display font-bold text-foreground">This area is restricted</h1>
      <p className="mx-auto mt-6 max-w-lg text-lead text-muted-foreground">
        You don&apos;t have permission to view this area. Access is granted by role and verified on the server.
      </p>
      <div className="mt-8 w-full max-w-lg">
        <PrototypeNotice>
          Your account&apos;s role doesn&apos;t include this area. Ask an administrator if you believe you need
          access.
        </PrototypeNotice>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/account/sign-in"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
        >
          <Lock className="size-4" aria-hidden="true" />
          Sign in
        </Link>
        <Link
          href="/account"
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50"
        >
          <UserRound className="size-4" aria-hidden="true" />
          Your account
        </Link>
      </div>
    </PageContainer>
  );
}
