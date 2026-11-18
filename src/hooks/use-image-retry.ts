"use client";

import { useState } from "react";

/**
 * IMAGE RETRY — turns transient load failures into self-healing retries.
 *
 * Product images come from /api/v1/media/*, which is served by the Worker
 * itself. Under bursty traffic the Worker can intermittently fail a request
 * (CPU/memory limits surface as error 1102 — the deployment runs on the
 * free plan), and a mobile network blip can drop one mid-flight. Consumers
 * used to latch a permanent "Image unavailable" state on the FIRST error,
 * so a one-in-a-hundred hiccup looked like a broken upload that only a
 * re-upload (or full reload) could fix — the exact "I had to upload it
 * several times before it showed up" report.
 *
 * The hook re-requests the image with a cache-busting query param (bypasses
 * any heuristically cached bad response in the browser/CDN) up to
 * `maxRetries` times before giving up and reporting failure.
 */

export interface ImageRetryState {
  /** The src to render — identical to the input until a retry appends ?retry=n. */
  effectiveSrc: string;
  /** True only after every retry has failed — safe to show the fallback. */
  failed: boolean;
  /** Wire to the image element's onError. */
  onError: () => void;
}

export function useImageRetry(src: string, maxRetries = 2): ImageRetryState {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  // A new src (variant highlight swap, media edit) resets the retry state.
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setAttempt(0);
    setFailed(false);
  }

  const onError = () => {
    if (attempt < maxRetries) {
      setAttempt((a) => a + 1);
    } else {
      setFailed(true);
    }
  };

  const effectiveSrc =
    attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`;

  return { effectiveSrc, failed, onError };
}
