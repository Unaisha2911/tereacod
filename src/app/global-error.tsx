"use client";

import { useEffect } from "react";

/**
 * Global error boundary — the LAST line of defence. It renders when
 * even the root layout throws, so it ships its own <html>/<body> and
 * inline styles only (globals.css cannot be assumed to have loaded).
 * For in-app errors the branded (site)/error.tsx boundary takes over.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the digest for support conversations (frontend-only build).
    console.error("Root-level application error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backgroundColor: "#0d0b09",
          color: "#f3efe8",
          fontFamily: "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <main style={{ maxWidth: 560, textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "#ddc18d",
            }}
          >
            TereaCOD
          </p>
          <p
            style={{
              margin: "28px 0 0",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#ef7d7d",
            }}
          >
            Unexpected error
          </p>
          <h1 style={{ margin: "14px 0 0", fontSize: "clamp(2.2rem, 7vw, 3.6rem)", lineHeight: 1.1, fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "20px auto 0", maxWidth: 420, fontSize: 15, lineHeight: 1.6, color: "rgba(243,239,232,0.66)" }}>
            {(error.digest ? "An unexpected error interrupted the application." : error.message) ||
              "An unexpected error interrupted the application."}
          </p>
          {error.digest && (
            <p style={{ margin: "14px 0 0", fontFamily: "monospace", fontSize: 12, color: "rgba(243,239,232,0.45)" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 36,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 48,
              padding: "0 28px",
              borderRadius: 9999,
              border: "1px solid rgba(201,163,102,0.55)",
              backgroundColor: "rgba(201,163,102,0.14)",
              color: "#f3efe8",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
