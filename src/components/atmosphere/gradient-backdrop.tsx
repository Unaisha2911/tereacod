/**
 * GradientBackdrop — static layered page background (server component).
 * The brand look: a white base with drifting sky-blue smoke washes
 * pooling in the corners, plus a soft blue haze vignette. Fixed so the
 * smoke stays put while content scrolls over it.
 */
export function GradientBackdrop({ variant = "page" }: { variant?: "page" | "account" | "admin" }) {
  // Variant keeps its API (call sites unchanged) — all three render the
  // same sky-smoke field; the account/admin consoles get a quieter wash.
  const smoke =
    variant === "admin"
      ? {
          background: `
            radial-gradient(56rem 36rem at 92% -12%, rgb(198 226 244 / 0.4) 0%, transparent 60%),
            radial-gradient(48rem 32rem at -10% 108%, rgb(198 226 244 / 0.34) 0%, transparent 58%),
            linear-gradient(180deg, #f4f9fd 0%, #ffffff 52%, #f2f8fc 100%)`,
        }
      : {
          background: `
            radial-gradient(62rem 42rem at 88% -10%, rgb(184 217 241 / 0.55) 0%, transparent 62%),
            radial-gradient(52rem 38rem at -12% 14%, rgb(199 228 246 / 0.5) 0%, transparent 58%),
            radial-gradient(44rem 30rem at 108% 58%, rgb(210 234 248 / 0.42) 0%, transparent 56%),
            radial-gradient(72rem 48rem at 50% 118%, rgb(206 232 247 / 0.6) 0%, transparent 62%),
            linear-gradient(180deg, #f3f8fc 0%, #ffffff 48%, #eff6fb 100%)`,
        };

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20" style={smoke}>
      {/* Soft sky haze at the page edges (replaces the dark vignette) */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(140% 110% at 50% 45%, transparent 58%, var(--edge-vignette) 100%)" }}
      />
    </div>
  );
}
