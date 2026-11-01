import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { GradientBackdrop } from "@/components/atmosphere/gradient-backdrop";
import { AmbientSmoke } from "@/components/atmosphere/ambient-smoke";
import { Compass, Home, LifeBuoy } from "lucide-react";

/**
 * Global 404 — self-contained (root not-found renders outside the
 * (site) layout). Branded, atmospheric, with recovery paths.
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <GradientBackdrop />
      <AmbientSmoke preset="ambient" palette="violet" intensity={0.7} zIndexClass="-z-10" position="fixed" />
      <header className="p-6 sm:p-8">
        <Logo />
      </header>
      <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="text-label font-semibold uppercase tracking-[0.24em] text-violet-soft">Error 404</p>
        <h1 className="mt-4 font-display text-[clamp(4rem,14vw,9rem)] font-bold leading-none tracking-tight text-gradient">
          Lost in the haze
        </h1>
        <p className="mt-6 max-w-md text-lead text-muted-foreground">
          This page doesn&apos;t exist — it may have moved, or the address may be mistyped.
        </p>
        <nav aria-label="Recovery" className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
          >
            <Home className="size-4" aria-hidden="true" />
            Back to the homepage
          </Link>
          <Link
            href="/discover"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
          >
            <Compass className="size-4" aria-hidden="true" />
            Discover TereaCOD
          </Link>
          <Link
            href="/help"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
          >
            <LifeBuoy className="size-4" aria-hidden="true" />
            Help centre
          </Link>
        </nav>
      </main>
      <footer className="p-6 text-center text-meta uppercase tracking-[0.16em] text-muted-foreground">
        TereaCOD — Dubai, United Arab Emirates
      </footer>
    </div>
  );
}
