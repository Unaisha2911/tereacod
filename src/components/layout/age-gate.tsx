"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Logo } from "./logo";

/**
 * AGE GATE — site-entry 18+ confirmation popup.
 *
 * REQUIRED compliance surface for a nicotine storefront: first-time
 * visitors must confirm they are of legal age before browsing.
 *
 * Delayed-entry strategy: the site renders and scrolls freely on arrival;
 * after a 5-second countdown (measured from FIRST PAINT via the
 * window.__ageGateT0 stamp the root-layout boot script writes, so slow
 * devices don't stack hydration latency on top of the delay) the overlay
 * fades in and locks body scroll until consent is stored. Returning
 * visitors with stored consent never see it.
 *
 * Visibility is CSS-driven from `html.age-gate-locked` (set when the
 * countdown fires, removed on consent) — the markup is identical on server
 * and client, so there is no hydration mismatch and no content flash.
 *
 * Consent state is read through useSyncExternalStore (localStorage is
 * external state — no setState-in-effect): after hydration React swaps
 * from the server snapshot (not consented) to the real consent value, and
 * cross-tab storage changes re-render the gate live (a consent landing in
 * another tab during the countdown cancels the reveal entirely).
 *
 * "Yes, I'm 18 or older" stores the consent and unlocks the site for
 * good (the prompt never returns). "No" swaps the card to a refusal
 * notice — the gate stays up and the site stays locked.
 */

const STORAGE_KEY = "tereacod.age-gate.v1";

/** How long a first-time visitor browses before the gate appears. */
const AGE_GATE_DELAY_MS = 5_000;

/** Same-tab + cross-tab notifications for the consent store. */
const consentListeners = new Set<() => void>();

function subscribeConsent(callback: () => void): () => void {
  consentListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    consentListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function consentSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode / quota — treat as never consented (gate stays up).
    return false;
  }
}

function notifyConsent(): void {
  for (const listener of consentListeners) listener();
}

export function AgeGate() {
  // Server snapshot assumes not consented (conservative default);
  // useSyncExternalStore re-renders with the real value after hydration.
  const consented = useSyncExternalStore(subscribeConsent, consentSnapshot, () => false);
  const locked = !consented;
  const [denied, setDenied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Countdown to the reveal, measured from first paint. If consent lands
  // during the wait (another tab accepted, or storage was pre-populated and
  // hydration caught up), the [consented] swap clears this timer and the
  // gate never appears.
  useEffect(() => {
    if (consented) return;
    const t0 = (window as unknown as { __ageGateT0?: number }).__ageGateT0;
    const wait = Math.max(0, AGE_GATE_DELAY_MS - (typeof t0 === "number" ? Date.now() - t0 : 0));
    const timer = setTimeout(() => setRevealed(true), wait);
    return () => clearTimeout(timer);
  }, [consented]);

  // Keep the html lock class in sync: the page only locks once the overlay
  // is actually visible (consent missing AND countdown elapsed).
  const active = locked && revealed;
  useEffect(() => {
    document.documentElement.classList.toggle("age-gate-locked", active);
    return () => {
      if (active) document.documentElement.classList.remove("age-gate-locked");
    };
  }, [active]);

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Storage unavailable — unlock for this visit only; the gate
      // returns on the next visit (session-only gating, never blocks).
    }
    document.documentElement.classList.remove("age-gate-locked");
    notifyConsent();
  };

  const decline = () => setDenied(true);

  return (
    <div
      className="age-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-body"
      aria-hidden={!active}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(58%_44%_at_18%_24%,rgba(139,92,246,0.2),transparent_68%),radial-gradient(46%_40%_at_84%_18%,rgba(215,95,212,0.14),transparent_66%)]" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md px-5">
        <div className="age-gate__card">
          {!denied ? (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <Logo />
                <p className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-warning">
                  <span className="size-1.5 rounded-full bg-warning shadow-[0_0_8px_rgba(251,191,36,0.9)]" aria-hidden="true" />
                  Adults 18+ only
                </p>
                <h2 id="age-gate-title" className="font-display text-h3 font-bold text-foreground">
                  Are you 18 or older?
                </h2>
                <p id="age-gate-body" className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  This website sells nicotine products intended for adult
                  smokers in the UAE. Please confirm your age to continue —
                  every delivery is age-verified with a valid Emirates ID at
                  the door.
                </p>
              </div>
              <div className="mt-7 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={accept}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-[filter,box-shadow] hover:brightness-110 hover:shadow-[0_0_24px_rgba(139,92,246,0.45)]"
                >
                  Yes, I&apos;m 18 or older — enter
                </button>
                <button
                  type="button"
                  onClick={decline}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line-strong bg-foreground/[0.03] font-medium text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
                >
                  No, I&apos;m under 18
                </button>
              </div>
              <p className="mt-5 text-center text-[0.72rem] leading-relaxed text-muted-foreground/80">
                Nicotine is an addictive chemical. Not for sale to persons
                under 18 in the UAE.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-error/30 bg-error/10 text-error" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-7" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.9 4.9 14.2 14.2" />
                </svg>
              </span>
              <h2 id="age-gate-title" className="font-display text-h3 font-bold text-foreground">
                Sorry — you can&apos;t enter
              </h2>
              <p id="age-gate-body" className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                TereaCOD sells nicotine products, which are restricted to
                adults aged 18 and over in the UAE. You must be of legal age
                to browse this store.
              </p>
              <a
                href="https://www.google.com"
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-foreground/[0.03] px-6 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Leave this site
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
