/**
 * GradientBackdrop — static layered page background (server component).
 * Neutral depth only: a soft vertical tone ladder plus a vignette. The
 * former violet/ice accent washes are retired with the neon look — the
 * background stays quiet so content and muted accents carry the page.
 */
export function GradientBackdrop({ variant = "page" }: { variant?: "page" | "account" | "admin" }) {
  // Variant keeps its API (call sites unchanged) — all three render the
  // same neutral field now; the former per-variant accent washes are gone.
  void variant;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20"
      style={{
        background: `linear-gradient(180deg, var(--bg-0) 0%, color-mix(in oklab, var(--bg-0) 78%, var(--bg-2)) 42%, var(--bg-0) 100%)`,
      }}
    >
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(140% 110% at 50% 45%, transparent 55%, var(--edge-vignette) 100%)" }}
      />
    </div>
  );
}
