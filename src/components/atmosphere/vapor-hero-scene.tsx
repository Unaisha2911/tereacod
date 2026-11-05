"use client";

import { useReducedMotion } from "framer-motion";
import { SmokeTexture } from "./smoke-texture";
import { useMotionBoundary } from "./motion-boundary";

type Plume = {
  /** Horizontal anchor inside the hero (percentage of width). */
  left: string;
  /** Plume width in px. */
  width: number;
  /** Plume height in vh — defines the travel of the rise animation. */
  height: number;
  /** RGB channels of the LED tint. */
  rgb: string;
  /** Peak opacity of the plume. */
  opacity: number;
  /** Rise duration in seconds. */
  duration: number;
  /** Delay before the first rise (negative to desynchronise). */
  delay: number;
  blur: number;
};

const VIOLET = "139 92 246";
const ICE = "111 214 242";
const MAGENTA = "215 95 212";
const RED = "255 42 84";

/**
 * Dense plume field — a packed vapor room. Four LED channels
 * (violet, ice, magenta, red) rise on staggered loops so at any
 * moment multiple plumes are mid-travel; the red channel keeps the
 * wall of smoke hot rather than uniformly cool.
 *
 * Perf trim: was sixteen plumes — each one is a blurred, animated
 * compositor layer, so the field was the single heaviest element on
 * the homepage. Eight plumes keep the full four-channel look at half
 * the GPU cost; the two lowest-opacity fillers stay hidden below md.
 */
const PLUMES: Plume[] = [
  { left: "-6%",  width: 210, height: 72, rgb: VIOLET,  opacity: 0.5,  duration: 16, delay: -2,  blur: 24 },
  { left: "15%",  width: 170, height: 64, rgb: ICE,     opacity: 0.38, duration: 19, delay: -13, blur: 20 },
  { left: "26%",  width: 240, height: 76, rgb: MAGENTA, opacity: 0.34, duration: 24, delay: -18, blur: 28 },
  { left: "45%",  width: 200, height: 70, rgb: VIOLET,  opacity: 0.46, duration: 17, delay: -11, blur: 22 },
  { left: "62%",  width: 260, height: 74, rgb: MAGENTA, opacity: 0.3,  duration: 26, delay: -14, blur: 29 },
  { left: "77%",  width: 190, height: 68, rgb: VIOLET,  opacity: 0.44, duration: 18, delay: -4,  blur: 21 },
  { left: "88%",  width: 150, height: 60, rgb: ICE,     opacity: 0.3,  duration: 23, delay: -16, blur: 20 },
  { left: "38%",  width: 140, height: 58, rgb: RED,     opacity: 0.26, duration: 27, delay: -22, blur: 27 },
];

/**
 * VaporHeroScene — smoke-only hero backdrop.
 *
 * The scene is built from smoke: three tinted photographic smoke
 * textures (keyed PNGs) churn and drift across the frame, eight
 * LED-tinted vapor plumes rise on staggered loops, and two low fog
 * banks slide along the floor — all over a static neon colour wash.
 * Motion is pure CSS transform/opacity — no JS per frame — and the
 * scene collapses to a calm static gradient under reduced motion.
 */
export function VaporHeroScene() {
  const reduced = useReducedMotion();
  // Pause every CSS animation in the scene while the boundary reports the
  // hero is off-screen — 20+ composited/blur layers otherwise keep
  // compositing (GPU memory, scroll cost, battery) with no one watching.
  const { visible } = useMotionBoundary();
  const paused = !visible && !reduced;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${paused ? "atmosphere-paused" : ""}`}
    >
      {/* Static neon colour wash — lighting only, no animation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 44% at 18% 24%, rgba(139,92,246,0.24), transparent 68%)," +
            "radial-gradient(46% 40% at 84% 18%, rgba(215,95,212,0.16), transparent 66%)," +
            "radial-gradient(44% 38% at 44% 10%, rgba(255,42,84,0.12), transparent 70%)," +
            "radial-gradient(60% 42% at 62% 88%, rgba(111,214,242,0.14), transparent 70%)",
        }}
      />

      {/* Photographic smoke textures — keyed PNG overlays tinted to the
          LED channels. Perf trim: three textures (was five) — the two
          dropped layers had the lowest opacity and the widest blur. */}
      {!reduced && (
        <>
          <SmokeTexture asset="wisps" color="#8b5cf6" drift="churn-a" duration={58} delay={-12} opacity={0.55} width="95%" x={-20} y={10} />
          <SmokeTexture asset="plume" color="#ff2a54" drift="drift-b" duration={64} delay={-34} opacity={0.44} width="82%" x={24} y={16} flipX blur={1} />
          <SmokeTexture asset="wisps" color="#6fd6f2" drift="fog-x" duration={50} delay={-6} opacity={0.32} width="130%" y={40} flipY />
        </>
      )}

      {/* Rising vapor plumes — the signature motion of the scene.
          The two lowest-opacity filler plumes are hidden below md to
          halve the blur-filter layer count on small/low-power devices. */}
      {PLUMES.map((plume, i) => (
        <div
          key={i}
          className={`absolute bottom-0 ${reduced ? "" : "anim-vapor"} ${i >= PLUMES.length - 2 ? "max-md:hidden" : ""}`}
          style={{
            left: plume.left,
            width: plume.width,
            height: `${plume.height}vh`,
            ["--dur" as string]: `${plume.duration}s`,
            ["--delay" as string]: `${plume.delay}s`,
            ["--vapor-opacity" as string]: plume.opacity,
          }}
        >
          <div className={`h-full w-full ${reduced ? "" : "anim-sway"}`} style={{ ["--dur" as string]: `${plume.duration / 2.4}s` }}>
            <div
              className="h-full w-full rounded-full"
              style={{
                background:
                  `linear-gradient(to top, rgb(${plume.rgb} / 0.55), rgb(${plume.rgb} / 0.18) 48%, transparent 82%)`,
                filter: `blur(${plume.blur}px)`,
                opacity: reduced ? 0.2 : 1,
                transform: reduced ? "translateY(-38%)" : undefined,
              }}
            />
          </div>
        </div>
      ))}

      {/* Low fog banks — wide haze sliding laterally along the floor.
          Perf trim: two banks (was three) — the magenta bank was the
          subtlest of the three and its blur radius is the most expensive. */}
      <div
        className={`absolute inset-x-[-14%] bottom-[4%] h-[17vh] ${reduced ? "" : "anim-fog-x"}`}
        style={{
          ["--dur" as string]: "36s",
          background:
            "radial-gradient(52% 100% at 50% 100%, rgba(139,92,246,0.2), rgba(139,92,246,0.06) 58%, transparent 78%)",
          filter: "blur(20px)",
        }}
      />
      <div
        className={`absolute inset-x-[-18%] bottom-[12%] h-[13vh] ${reduced ? "" : "anim-fog-x"}`}
        style={{
          ["--dur" as string]: "47s",
          ["--delay" as string]: "-19s",
          background:
            "radial-gradient(48% 100% at 44% 100%, rgba(255,42,84,0.14), rgba(111,214,242,0.06) 60%, transparent 80%)",
          filter: "blur(22px)",
        }}
      />
    </div>
  );
}
