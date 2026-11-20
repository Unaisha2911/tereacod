"use client";

import { useEffect, useState } from "react";

/**
 * useScrollDirection — "up" | "down" with hysteresis.
 *
 * Drives the app-like chrome behaviour on phones: the header and the
 * bottom navigation slide away while the visitor scrolls down and slide
 * back the moment they scroll up (or return near the top).
 *
 * Details:
 * - rAF-throttled passive scroll listener (no layout thrash).
 * - DELTA hysteresis ignores sub-pixel jitter (momentum, rubber-banding)
 *   so the chrome never flickers.
 * - TOP_THRESHOLD keeps the chrome visible while the page head is on
 *   screen — hiding the header above the fold reads as a glitch.
 * - Initial state is always "up" (chrome visible, SSR-consistent).
 */
export function useScrollDirection(): "up" | "down" {
  const [direction, setDirection] = useState<"up" | "down">("up");

  useEffect(() => {
    const DELTA = 8;
    const TOP_THRESHOLD = 140;
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      if (y <= TOP_THRESHOLD) {
        setDirection("up");
      } else {
        const dy = y - lastY;
        if (dy > DELTA) setDirection("down");
        else if (dy < -DELTA) setDirection("up");
      }
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return direction;
}
