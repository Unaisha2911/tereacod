import { Link } from "@/components/shared/shop-link";
import { BadgeCheck, Banknote, ChevronDown, Truck, Zap } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { SmokeSignature } from "@/components/atmosphere/smoke-signature";
import { USP_FREE_DELIVERY, USP_ONE_HOUR_DELIVERY, USP_PAYMENT } from "@/lib/usp";

const HERO_MICRO_LABELS = [
  USP_FREE_DELIVERY,
  USP_ONE_HOUR_DELIVERY,
  "100% authentic TEREA sticks",
  USP_PAYMENT,
];

/**
 * Feature chips orbiting the smoke medallion — the headline promises,
 * presented as floating glass badges. On phones they stand down (the
 * micro-label row below the CTAs carries the same promises there).
 */
const HERO_FEATURE_CHIPS = [
  { label: "1-hour Dubai delivery", icon: Zap, tone: "text-violet-soft", pos: "right-[1%] top-[14%]", dur: "6.6s", delay: "0s" },
  { label: "Free delivery over AED 300", icon: Truck, tone: "text-ice", pos: "left-[-2%] top-[46%]", dur: "8s", delay: "-2.2s" },
  { label: "Cash & card on delivery", icon: Banknote, tone: "text-violet-soft", pos: "right-[5%] top-[72%]", dur: "7.2s", delay: "-4.1s" },
  { label: "100% authentic stock", icon: BadgeCheck, tone: "text-ice", pos: "left-[6%] bottom-[4%]", dur: "9s", delay: "-1.4s" },
] as const;

/**
 * HeroSection — full-viewport opener with the smoke feature area.
 *
 * PERF MODEL: the copy column keeps its CSS-only entrance (the previous
 * framer-motion stagger SSR'd `opacity: 0` inline on the headline and
 * only revealed it after hydration — a measured 2,470ms LCP element
 * delay). CSS animations start at first paint, so the LCP headline
 * paints within ~one frame of its stagger slot. Reduced motion is
 * handled globally in globals.css.
 *
 * Layout: copy left, smoke signature right — the medallion (animated
 * turbulence-displaced smoke) with the delivery promises orbiting as
 * glass chips. On phones the medallion drops below the copy at a
 * reduced size and the chips hide (micro-labels carry the promises).
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative -mt-[6.25rem] flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* Legibility veil — lifts the smoke wash under the fixed header and
          above the fold edge so text stays crisp on the light canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(180deg,var(--scrim-ink)_0%,rgba(255,255,255,0)_32%,rgba(255,255,255,0)_58%,var(--scrim-ink)_100%)]"
      />

      <PageContainer className="relative z-10 py-20 sm:py-24 lg:py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8 xl:gap-12">
          {/* Copy column */}
          <div className="flex flex-col items-start">
            <p
              className="hero-rise inline-flex items-center gap-2.5 rounded-full border border-violet-glow/35 bg-foreground/10 px-4 py-1.5 text-meta font-medium uppercase tracking-[0.22em] text-muted-foreground"
              style={{ ["--d" as string]: "0s" }}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-led-red text-led-red" />
              UAE · DUBAI WAREHOUSE · ADULTS 18+
            </p>

            {/* LCP element — first stagger slot after the badge so the headline
                paints ~80ms after first frame (was: after hydration). */}
            <h1
              id="hero-heading"
              className="hero-rise mt-7 text-hero-neon font-neon font-bold uppercase"
              style={{ ["--d" as string]: "0.08s" }}
            >
              <span className="block text-foreground">TEREA Delivery in UAE</span>
              <span className="block text-violet-soft">cash &amp; card on delivery</span>
              {/* Keyword reinforcement for crawlers — visible heading stays flat. */}
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
                className="rounded-full bg-primary px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Shop now
              </Link>
              <Link
                href="/brand"
                className="rounded-full border border-violet-glow/45 bg-foreground/[0.03] px-7 py-3.5 text-sm font-medium uppercase tracking-[0.08em] text-foreground transition-colors hover:border-ice/60 hover:bg-foreground/[0.08]"
              >
                Browse TEREA range
              </Link>
            </div>

            {/* Phone-width reinforcement of the promises — desktop reads
                them off the feature chips around the smoke medallion. */}
            <ul
              aria-label="TereaCOD delivery assurances"
              className="hero-rise mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 text-meta uppercase tracking-widest text-muted-foreground lg:hidden"
              style={{ ["--d" as string]: "0.32s" }}
            >
              {HERO_MICRO_LABELS.map((label, i) => {
                const dotColor = ["bg-violet-soft text-violet-soft", "bg-ice text-ice", "bg-led-red text-led-red"][i % 3];
                return (
                  <li key={label} className="flex items-center gap-4">
                    {i > 0 && (
                      <span aria-hidden="true" className={`size-1 rounded-full ${dotColor}`} />
                    )}
                    <span>{label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Feature area — the smoke signature with orbiting promise chips.
              Mobile: smaller medallion below the copy; chips stand down. */}
          <div
            className="hero-rise relative mx-auto w-full max-w-[19rem] sm:max-w-[24rem] lg:max-w-[30rem] xl:max-w-[34rem]"
            style={{ ["--d" as string]: "0.18s" }}
          >
            <SmokeSignature />

            {HERO_FEATURE_CHIPS.map((chip) => (
              <div
                key={chip.label}
                className={`anim-float absolute ${chip.pos} hidden items-center gap-2 rounded-full border border-line bg-white/80 px-4 py-2.5 text-[0.72rem] font-semibold text-foreground shadow-[0_10px_28px_-14px_rgba(23,68,105,0.35)] backdrop-blur sm:flex`}
                style={{ ["--dur" as string]: chip.dur, animationDelay: chip.delay }}
              >
                <chip.icon className={`size-3.5 shrink-0 ${chip.tone}`} aria-hidden="true" />
                {chip.label}
              </div>
            ))}
          </div>
        </div>
      </PageContainer>

      {/* Scroll indicator — lifted above the fixed mobile bottom nav (z-50).
          Pure CSS bob (float-soft), no hydration dependency. */}
      <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 md:bottom-8">
        <a
          href="#products"
          className="anim-float flex size-11 items-center justify-center rounded-full border border-line bg-white/75 text-muted-foreground shadow-[0_6px_20px_-8px_rgba(23,68,105,0.35)] backdrop-blur transition-colors hover:border-violet-glow/60 hover:text-foreground"
          style={{ ["--dur" as string]: "2.4s" }}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
          <span className="sr-only">Scroll to featured products</span>
        </a>
      </div>
    </section>
  );
}
