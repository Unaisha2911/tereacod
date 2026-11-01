"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

/**
 * AgeGate — site-wide 18+ verification overlay (public site only).
 *
 * Behaviour (per product spec):
 *  1. The gate waits 5 seconds after a visitor lands on the site, so the
 *     page is seen first, then the verification popup appears.
 *  2. "Yes, I'm 18 or older"  → confirmed once and remembered in
 *     localStorage, so returning visitors are never asked again.
 *  3. "No, I'm under 18"      → the gate locks into a "not eligible"
 *     screen. The site stays covered; there is no dismiss path. A reload
 *     starts the flow again — a minor can never get past it.
 *
 * Deliberate hardening:
 *  - The overlay is NOT a Radix Dialog: Escape / outside-click must never
 *    dismiss an age gate, so interaction is hand-rolled (focus trap that
 *    ignores Escape, no close affordance).
 *  - Body scroll is locked while the gate is visible.
 *  - Renders nothing on the server (SSR-safe: no hydration mismatch) and
 *    only after mount reads localStorage.
 *  - Lives in the public AppShell — the admin console is exempt.
 *
 * Compliance note: this is a client-side first-line gate. Legal proof of
 * age still happens at delivery (Emirates ID check) and at checkout —
 * the gate is about keeping the storefront adult-only, not identity.
 */

const STORAGE_KEY = "tereacod:age-verified:v1";
const SHOW_AFTER_MS = 5_000;

type Phase = "idle" | "question" | "blocked";

export function AgeGate() {
  const [phase, setPhase] = useState<Phase>("idle");
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const yesButtonRef = useRef<HTMLButtonElement>(null);

  /* ------------------------- mount: schedule the gate ------------------------ */

  useEffect(() => {
    let alreadyVerified = false;
    try {
      alreadyVerified = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Storage can throw in private-mode edge cases — treat as unverified.
    }
    if (alreadyVerified) return;

    const timer = window.setTimeout(() => setPhase("question"), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  /* ------------------- visible: lock scroll + manage focus ------------------- */

  const visible = phase === "question" || phase === "blocked";

  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    yesButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      // Escape must NOT close an age gate.
      if (event.key === "Escape") {
        event.preventDefault();
        return;
      }
      // Minimal focus trap: keep Tab cycling inside the card.
      if (event.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const focusables = card.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !card.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [visible]);

  /* -------------------------------- actions -------------------------------- */

  const confirmAdult = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Best effort — without storage the gate simply reappears next visit.
    }
    setPhase("idle");
  }, []);

  const declareMinor = useCallback(() => setPhase("blocked"), []);

  /* --------------------------------- render -------------------------------- */

  if (phase === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        key="age-gate"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 px-4 backdrop-blur-md"
        style={{ pointerEvents: "auto" }}
      >
        <motion.div
          ref={cardRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="age-gate-title"
          aria-describedby="age-gate-description"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-violet-glow/25 bg-card/95 p-6 shadow-2xl shadow-violet-glow/10 sm:p-8"
        >
          {/* top glow line */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-glow/60 to-transparent"
          />

          {phase === "question" ? (
            <div className="flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-violet-glow/30 bg-violet-glow/10">
                <ShieldCheck className="size-8 text-violet-glow" aria-hidden="true" />
              </div>

              <p className="mt-6 font-neon text-[0.7rem] font-bold uppercase tracking-[0.35em] text-violet-glow">
                TereaCOD
              </p>
              <h2 id="age-gate-title" className="mt-2 text-display text-2xl font-bold text-foreground sm:text-3xl">
                Are you 18 or older?
              </h2>
              <p id="age-gate-description" className="mt-4 max-w-sm text-lead text-sm leading-relaxed text-muted-foreground">
                TereaCOD sells nicotine products intended strictly for adults.
                Under UAE law you must be 18 or older to enter this store.
              </p>

              <div className="mt-6 w-full rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-left">
                <p className="flex items-start gap-2 text-xs leading-relaxed text-warning">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    Nicotine is addictive. Every order is handed over only after a
                    valid Emirates ID age check at the door.
                  </span>
                </p>
              </div>

              <div className="mt-6 flex w-full flex-col gap-3">
                <button
                  ref={yesButtonRef}
                  type="button"
                  onClick={confirmAdult}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Yes, I&apos;m 18 or older
                </button>
                <button
                  type="button"
                  onClick={declareMinor}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-led-red/50 hover:text-led-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  No, I&apos;m under 18
                </button>
              </div>

              <p className="mt-5 text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground/70">
                Age verification · UAE federal law
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-led-red/30 bg-led-red/10">
                <ShieldX className="size-8 text-led-red" aria-hidden="true" />
              </div>

              <p className="mt-6 font-neon text-[0.7rem] font-bold uppercase tracking-[0.35em] text-led-red">
                Access denied
              </p>
              <h2 id="age-gate-title" className="mt-2 text-display text-2xl font-bold text-foreground sm:text-3xl">
                You are not eligible to explore this website
              </h2>
              <p id="age-gate-description" className="mt-4 max-w-sm text-lead text-sm leading-relaxed text-muted-foreground">
                TereaCOD is an adults-only (18+) nicotine retailer. You declared
                that you are under the legal age, so you cannot continue browsing
                this store.
              </p>

              <div className="mt-6 w-full rounded-2xl border border-line bg-surface/60 px-4 py-3 text-left">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Nicotine products are legally restricted to adults aged 18 and
                  over in the UAE. If this was a mistake, you can reload the page
                  and confirm your age — otherwise we&apos;ll see you when
                  you&apos;re of legal age.
                </p>
              </div>

              <p className="mt-6 text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground/70">
                TereaCOD · Adults only · 18+
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
