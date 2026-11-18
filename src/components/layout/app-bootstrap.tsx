"use client";

import { useEffect, useRef } from "react";
import { hydrateFromServer } from "@/services/bootstrap";

/**
 * APP BOOTSTRAP PROVIDER
 * ----------------------
 * Runs once per page load on the client and hydrates the auth store, the
 * server-backed cart, the saved-items store, the WhatsApp number and the
 * client catalog mirror. Children render immediately — every consuming view
 * has its own hydrated/loading state.
 *
 * Performance: the whole hydration is now ONE request (GET /api/v1/bootstrap)
 * instead of the former three-call fan-out (session + cart + settings, plus
 * a catalog-subset fetch whenever the cart held items). See
 * src/services/bootstrap.ts for the request budget and the legacy fallback.
 */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void hydrateFromServer();
  }, []);

  return <>{children}</>;
}
