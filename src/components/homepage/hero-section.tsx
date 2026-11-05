import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { USP_FREE_DELIVERY, USP_ONE_HOUR_DELIVERY, USP_PAYMENT } from "@/lib/usp";

const HERO_MICRO_LABELS = [
  USP_FREE_DELIVERY,
  USP_ONE_HOUR_DELIVERY,
  "100% authentic TEREA sticks",
  USP_PAYMENT,
];

/**
 * HeroSection — full-viewport electric opener.
 *
 * PERF MODEL: the hero is a SERVER component with a CSS-only entrance.
 * The previous framer-motion stagger SSR'd `opacity: 0` inline on the
 * headline and only revealed it after hydration + the JS stagger ran —
 * Lighthouse measured a 2,470ms "element render delay" on the LCP text
 * ("TEREA Delivery in UAE"). CSS animations start at first paint with
 * zero hydration dependency, so the LCP paints within ~one frame of
 * its stagger slot. Reduced motion is handled globally in globals.css
 * (all animations collapse to instant under prefers-reduced-motion).
 *
 * The hero also carries a single STATIC neon colour wash (one div, four
 * radial-gradient stops — zero animation, zero blur layers, zero image
 * fetches). All moving smoke lives in the ONE fixed page-level
 * AmbientSmoke in the app shell, which drifts behind every section.
 *
 * Headlines use the neon display face: line one is a lit neon sign, line
 * two a hollow LED tube with a slow flicker (anim-flicker, opacity-only).
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative -mt-[6.25rem] flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* Static neon colour wash — lighting only, no animation. The moving
          smoke comes from the fixed page-level AmbientSmoke behind it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 44% at 18% 24%, rgba(139,92,246,0.24), transparent 68%)," +
            "radial-gradient(46% 40% at 84% 18%, rgba(215,95,212,0.16), transparent 66%)," +
            "radial-gradient(44% 38% at 44% 10%, rgba(255,42,84,0.12), transparent 70%)," +
            "radial-gradient(60% 42% at 62% 88%, rgba(111,214,242,0.14), transparent 70%)",
        }}
      />

      {/* Legibility scrim — keeps atmosphere visible, text readable */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(180deg,var(--scrim-ink)_0%,rgba(6,4,9,0)_30%,rgba(6,4,9,0)_56%,var(--scrim-ink)_100%)]"
      />

      <PageContainer className="relative z-10 py-24 sm:py-28">
        <div className="flex flex-col items-start">
          <p
            className="hero-rise inline-flex items-center gap-2.5 rounded-full border border-violet-glow/35 bg-foreground/10 px-4 py-1.5 text-meta font-medium uppercase tracking-[0.22em] text-muted-foreground shadow-[0_0_18px_rgba(139,92,246,0.25)]"
            style={{ ["--d" as string]: "0s" }}
          >
            <span
              aria-hidden="true"
              className="anim-led size-1.5 rounded-full bg-led-red text-led-red"
              style={{ ["--dur" as string]: "2.4s" }}
            />
            UAE · DUBAI WAREHOUSE · ADULTS 18+
          </p>

          {/* LCP element — first stagger slot after the badge so the neon
              line paints ~80ms after first frame (was: after hydration). */}
          <h1
            id="hero-heading"
            className="hero-rise mt-7 text-hero-neon font-neon font-bold uppercase"
            style={{ ["--d" as string]: "0.08s" }}
          >
            <span className="block text-neon-mix">TEREA Delivery in UAE</span>
            <span
              className="anim-flicker block text-neon-outline-duo"
              data-text="cash & card on delivery"
              style={{ ["--dur" as string]: "9s", ["--delay" as string]: "2s" }}
            >
              cash &amp; card on delivery
            </span>
            {/* Keyword reinforcement for crawlers — visible heading stays pure neon. */}
            <span className="sr-only">
              TereaCOD — TEREA delivery across the UAE. Buy authentic TEREA heated tobacco sticks for IQOS ILUMA online with cash or card on delivery.
            </span>
          </h1>

          <p
            className="hero-rise mt-6 max-w-md text-lead text-muted-foreground"
            style={{ ["--d" as string]: "0.16s" }}
          >
            Order authentic TEREA sticks for your IQOS ILUMA device — every
            pack checked, priced in AED and dispatched from our Dubai
            warehouse the same day, with cash or card on delivery.
          </p>

          <div
            className="hero-rise mt-9 flex flex-wrap items-center gap-3 sm:gap-4"
            style={{ ["--d" as string]: "0.24s" }}
          >
            <Link
              href="/discover"
              className="neon-glow-btn hover:neon-glow-btn-hover rounded-full bg-primary px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Shop now
            </Link>
            <Link
              href="/brand"
              className="rounded-full border border-violet-glow/45 bg-foreground/[0.03] px-7 py-3.5 text-sm font-medium uppercase tracking-[0.08em] text-foreground shadow-[0_0_14px_rgba(111,214,242,0.14)] transition-colors hover:border-ice/60 hover:bg-foreground/[0.08] hover:shadow-[0_0_22px_rgba(111,214,242,0.3)]"
            >
              Browse TEREA range
            </Link>
          </div>

          <ul
            aria-label="TereaCOD delivery assurances"
            className="hero-rise mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 text-meta uppercase tracking-widest text-muted-foreground"
            style={{ ["--d" as string]: "0.32s" }}
          >
            {HERO_MICRO_LABELS.map((label, i) => {
              const dotColor = ["bg-violet-soft text-violet-soft", "bg-ice text-ice", "bg-led-red text-led-red"][i % 3];
              return (
                <li key={label} className="flex items-center gap-4">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className={`size-1 rounded-full ${dotColor} anim-led`}
                      style={{ ["--dur" as string]: `${2.2 + i * 0.7}s` }}
                    />
                  )}
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </PageContainer>

      {/* Scroll indicator — lifted above the fixed mobile bottom nav (z-50).
          Pure CSS bob (float-soft), no hydration dependency. */}
      <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 md:bottom-8">
        <a
          href="#products"
          className="anim-float flex size-11 items-center justify-center rounded-full border border-line bg-black/50 text-muted-foreground shadow-[0_0_16px_rgba(139,92,246,0.2)] transition-colors hover:border-violet-glow/60 hover:text-foreground hover:shadow-[0_0_22px_rgba(139,92,246,0.45)]"
          style={{ ["--dur" as string]: "2.4s" }}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
          <span className="sr-only">Scroll to featured products</span>
        </a>
      </div>
    </section>
  );
}
