/**
 * Atmosphere presets — the Smoke Engine's intensity levels.
 *
 * Every layer is a KEYED PNG SMOKE TEXTURE (public/smoke/*): white
 * vapor with a luminance-keyed alpha channel, tinted to an LED colour
 * and screen-blended into the scene. No gradient blobs, no CSS
 * `filter: blur()` — the PNGs are pre-softened, so each layer is a
 * single cheap composited texture (transform/opacity motion only).
 * This is what keeps scrolling smooth while the smoke stays dense.
 *
 *  ambient   : default; dense, clearly-moving vapor on all devices
 *  cinematic : heavier multi-channel smoke for capable desktops
 *  reduced   : static/minimal for reduced-motion and low-power
 */

export type AtmospherePreset = "ambient" | "cinematic" | "reduced";

export type SmokeDrift = "drift-a" | "drift-b" | "drift-c" | "churn-a" | "churn-b" | "fog-x";

export interface SmokeTextureConfig {
  /** Which keyed PNG to use. */
  asset: "plume" | "wisps" | "column";
  /** LED tint colour. */
  color: string;
  /** Box width in % of the hosting scene. */
  width: string;
  /** Centre offset in % of the host. */
  x: number;
  y: number;
  /** Layer opacity 0..1. */
  opacity: number;
  /** Keyframe drift pattern (class suffix: `anim-<drift>`). */
  drift: SmokeDrift;
  /** Animation duration seconds. */
  duration: number;
  /** Animation delay (negative to desync). */
  delay: number;
  /** Mirror horizontally / vertically for variety. */
  flipX?: boolean;
  flipY?: boolean;
}

export interface AtmospherePresetConfig {
  layers: SmokeTextureConfig[];
  particles: number;
  particleOpacity: number;
  /** Master multiplier applied to opacities. */
  intensity: number;
  /** Pointer parallax max offset px. */
  parallax: number;
}

const T = (
  asset: SmokeTextureConfig["asset"],
  color: string,
  width: string,
  x: number,
  y: number,
  opacity: number,
  drift: SmokeDrift,
  duration: number,
  delay: number,
  flip?: { x?: boolean; y?: boolean }
): SmokeTextureConfig => ({
  asset,
  color,
  width,
  x,
  y,
  opacity,
  drift,
  duration,
  delay,
  flipX: flip?.x,
  flipY: flip?.y,
});

const VIOLET = "#8b5cf6";
const VIOLET_SOFT = "#a78bfa";
const ICE = "#6fd6f2";
const MAGENTA = "#d75fd4";
const RED = "#ff2a54";
const RED_SOFT = "#ff5c74";

export const ATMOSPHERE_PRESETS: Record<AtmospherePreset, AtmospherePresetConfig> = {
  ambient: {
    intensity: 1,
    particles: 0,
    particleOpacity: 0,
    parallax: 10,
    layers: [
      T("wisps", VIOLET, "110%", -12, 8, 0.3, "churn-a", 58, -12),
      T("plume", ICE, "85%", 22, 18, 0.22, "drift-b", 66, -30, { x: true }),
      T("wisps", MAGENTA, "90%", 16, -14, 0.2, "drift-c", 62, -20, { x: true }),
      T("wisps", RED, "130%", 0, 42, 0.18, "fog-x", 54, -8, { y: true }),
    ],
  },
  cinematic: {
    intensity: 1.1,
    particles: 0,
    particleOpacity: 0,
    parallax: 14,
    layers: [
      T("wisps", VIOLET, "115%", -14, 6, 0.34, "churn-a", 54, -10),
      T("plume", ICE, "90%", 24, 16, 0.26, "drift-b", 62, -28, { x: true }),
      T("wisps", MAGENTA, "95%", 18, -16, 0.24, "drift-c", 58, -18, { x: true }),
      T("wisps", RED, "130%", 0, 42, 0.22, "fog-x", 50, -6, { y: true }),
      T("column", VIOLET_SOFT, "34%", -6, 2, 0.18, "drift-a", 70, -26),
      T("wisps", RED_SOFT, "72%", -28, 22, 0.18, "churn-b", 48, -16, { x: true }),
    ],
  },
  reduced: {
    intensity: 0.6,
    particles: 0,
    particleOpacity: 0,
    parallax: 0,
    layers: [T("wisps", VIOLET, "100%", 0, 10, 0.14, "drift-a", 80, 0)],
  },
};

/** Pick a safe preset from device signals. Never chooses cinematic on low-power. */
export function resolvePreset(
  requested: AtmospherePreset | undefined,
  reducedMotion: boolean,
  deviceMemory?: number,
  connection?: { saveData?: boolean }
): AtmospherePreset {
  if (reducedMotion) return "reduced";
  if (typeof navigator !== "undefined") {
    const lowPower =
      (deviceMemory !== undefined && deviceMemory > 0 && deviceMemory <= 4) || connection?.saveData === true;
    if (lowPower && requested === "cinematic") return "ambient";
  }
  return requested ?? "ambient";
}
