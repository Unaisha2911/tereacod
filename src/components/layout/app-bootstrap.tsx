"use client";

import { useEffect, useRef } from "react";
import { hydrateCartFromServer } from "@/services/cart";
import { hydrateAuthFromServer, useAuth } from "@/services/account";
import { hydrateSavedItemsFromServer } from "@/services/saved-items";

/**
 * APP BOOTSTRAP PROVIDER
 * ----------------------
 * Runs once per page load on the client: hydrates the auth store, the
 * server-backed cart, the saved-items store and the WhatsApp number from
 * the site config. Children render immediately — every consuming view has
 * its own hydrated/loading state.
 *
 * Performance: the four bootstrap reads used to run as THREE sequential
 * stages (session → cart+saved → settings). Session and settings are
 * independent, so they now race in parallel from the first tick, and the
 * WhatsApp settings response is cached in sessionStorage (10 min) so
 * repeat loads skip the call entirely. Cart/saved still start together
 * the moment the session result lands (saved hydration needs the
 * signed-in flag).
 */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Stage 1 (parallel): session identity + site settings.
    const sessionReady = hydrateAuthFromServer();
    void hydrateWhatsAppNumber();

    void (async () => {
      await sessionReady;
      const auth = useAuth.getState();
      // Stage 2 (parallel): cart + saved items.
      await Promise.all([
        hydrateCartFromServer(),
        hydrateSavedItemsFromServer(Boolean(auth.user)),
      ]);
    })();
  }, []);

  return <>{children}</>;
}

const WHATSAPP_CACHE_KEY = "tereacod.whatsapp.v1";
const WHATSAPP_CACHE_TTL_MS = 10 * 60 * 1000;

function readCachedWhatsApp(): string | null {
  try {
    const raw = sessionStorage.getItem(WHATSAPP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value: string; at: number };
    if (!parsed.value || Date.now() - parsed.at > WHATSAPP_CACHE_TTL_MS) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

/** Pull the WhatsApp number from site settings (KV-backed) once per TTL window. */
let whatsappLoaded = false;
async function hydrateWhatsAppNumber(): Promise<void> {
  if (whatsappLoaded) return;
  whatsappLoaded = true;

  const cached = readCachedWhatsApp();
  if (cached) {
    const { setWhatsAppNumber } = await import("@/services/whatsapp");
    setWhatsAppNumber(cached);
    return;
  }

  try {
    const response = await fetch("/api/v1/site/settings", { headers: { accept: "application/json" } });
    if (!response.ok) return;
    const body = (await response.json()) as { data: { contact?: { whatsapp?: string } } };
    const whatsapp = body.data?.contact?.whatsapp;
    if (whatsapp) {
      try {
        sessionStorage.setItem(WHATSAPP_CACHE_KEY, JSON.stringify({ value: whatsapp, at: Date.now() }));
      } catch {
        // Private mode / quota — next load refetches.
      }
      const { setWhatsAppNumber } = await import("@/services/whatsapp");
      setWhatsAppNumber(whatsapp);
    }
  } catch {
    // Keep the compiled-in default.
  }
}
