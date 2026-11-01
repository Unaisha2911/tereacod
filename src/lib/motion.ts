import type { Transition, Variants } from "framer-motion";

/**
 * Centralized motion system — every animation in the site references
 * these presets instead of scattering ad-hoc values across components.
 * Reduced-motion handling: components gate on useReducedMotion() and
 * fall back to opacity-only or none.
 */

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;
export const EASE_SMOOTH = [0.65, 0, 0.35, 1] as const;

export const transitions = {
  fast: { duration: 0.18, ease: EASE_OUT_EXPO } satisfies Transition,
  smooth: { duration: 0.45, ease: EASE_OUT_EXPO } satisfies Transition,
  slow: { duration: 0.9, ease: EASE_OUT_EXPO } satisfies Transition,
  spring: { type: "spring", stiffness: 260, damping: 30 } satisfies Transition,
} as const;

export const variants = {
  /** Pure fade — the reduced-motion-safe baseline. */
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitions.smooth },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
  /** Fade + rise. */
  fadeUp: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: transitions.smooth },
    exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
  },
  /** Editorial image reveal — clip + subtle scale. */
  imageReveal: {
    hidden: { opacity: 0, scale: 1.06, clipPath: "inset(8% 8% 8% 8% round 24px)" },
    visible: {
      opacity: 1,
      scale: 1,
      clipPath: "inset(0% 0% 0% 0% round 24px)",
      transition: { duration: 0.85, ease: EASE_OUT_EXPO },
    },
  },
  /** Overlays. */
  backdrop: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.25 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
  drawerRight: {
    hidden: { x: "100%" },
    visible: { x: 0, transition: { duration: 0.42, ease: EASE_OUT_EXPO } },
    exit: { x: "100%", transition: { duration: 0.28, ease: EASE_SMOOTH } },
  },
  /** Left-anchored drawer — matches a top-left trigger affordance. */
  drawerLeft: {
    hidden: { x: "-100%" },
    visible: { x: 0, transition: { duration: 0.42, ease: EASE_OUT_EXPO } },
    exit: { x: "-100%", transition: { duration: 0.28, ease: EASE_SMOOTH } },
  },
} satisfies Record<string, Variants>;

/** Stagger container — children use variants.staggerItem. */
export const staggerContainer = (stagger = 0.08, delayChildren = 0.05): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.smooth },
};

/** Pointer-feedback helpers for cards/buttons. */
export const pressTap = { scale: 0.975 } as const;

/** Viewport config for scroll reveals. */
export const revealViewport = { once: true, amount: 0.2, margin: "0px 0px -8% 0px" } as const;

/**
 * Smoothly scroll an element into view below the sticky header.
 * Honours prefers-reduced-motion (falls back to an instant jump).
 */
export function scrollIntoViewSmooth(el: HTMLElement | null) {
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}
