"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget (explicit render).
 *
 * Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured at
 * build time — the server-side check (src/server/turnstile.ts) fails open
 * when TURNSTILE_SECRET_KEY is absent, so the pair of env vars must be
 * configured together in production. Once the key exists, every auth and
 * contact form submits a `turnstileToken` with its payload; a missing or
 * failed token is rejected server-side with "Captcha verification failed".
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_SELECTOR = 'script[src^="https://challenges.cloudflare.com/turnstile"]';

export function TurnstileWidget({
  onToken,
  action,
}: {
  onToken: (token: string | null) => void;
  action?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current !== null) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          ...(action ? { action } : {}),
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      } catch {
        // Render failure (blocked network, ad-blocker) leaves the token
        // null — the server responds with the captcha error and the form
        // surfaces it, so the failure mode stays visible instead of silent.
      }
    };

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      // The script may already be loaded (bfcache restore) but the global
      // not yet observed — retry once on the next tick.
      const retry = window.setTimeout(render, 50);
      return () => {
        cancelled = true;
        window.clearTimeout(retry);
        script.removeEventListener("load", render);
        if (widgetIdRef.current !== null && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Widget already gone.
          }
          widgetIdRef.current = null;
        }
      };
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget already gone.
        }
        widgetIdRef.current = null;
      }
    };
  }, [action]);

  if (!SITE_KEY) return null;
  return (
    <div
      ref={containerRef}
      className="flex min-h-[65px] justify-center"
      role="presentation"
      aria-label="Spam protection check"
    />
  );
}
