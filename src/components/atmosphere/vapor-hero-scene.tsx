"use client";

import { useReducedMotion } from "framer-motion";
import { SmokeTexture } from "./smoke-texture";

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
 */
const PLUMES: Plume[] = [
  { left: "-6%",  width: 210, height: 72, rgb: VIOLET,  opacity: 0.5,  duration: 16, delay: -2,  blur: 24 },
  { left: "6%",   width: 140, height: 60, rgb: RED,     opacity: 0.34, duration: 21, delay: -9,  blur: 21 },
  { left: "15%",  width: 170, height: 64, rgb: ICE,     opacity: 0.38, duration: 19, delay: -13, blur: 20 },
  { left: "26%",  width: 240, height: 76, rgb: MAGENTA, opacity: 0.34, duration: 24, delay: -18, blur: 28 },
  { left: "37%",  width: 150, height: 58, rgb: RED,     opacity: 0.32, duration: 22, delay: -5,  blur: 22 },
  { left: "45%",  width: 200, height: 70, rgb: VIOLET,  opacity: 0.46, duration: 17, delay: -11, blur: 22 },
  { left: "54%",  width: 150, height: 62, rgb: ICE,     opacity: 0.3,  duration: 25, delay: -19, blur: 25 },
  { left: "62%",  width: 260, height: 74, rgb: MAGENTA, opacity: 0.3,  duration: 26, delay: -14, blur: 29 },
  { left: "70%",  width: 170, height: 66, rgb: RED,     opacity: 0.32, duration: 20, delay: -7,  blur: 21 },
  { left: "77%",  width: 190, height: 68, rgb: VIOLET,  opacity: 0.44, duration: 18, delay: -4,  blur: 21 },
  { left: "85%",  width: 140, height: 58, rgb: ICE,     opacity: 0.32, duration: 23, delay: -16, blur: 20 },
  { left: "91%",  width: 170, height: 62, rgb: MAGENTA, opacity: 0.3,  duration: 22, delay: -10, blur: 24 },
  { left: "33%",  width: 130, height: 54, rgb: VIOLET,  opacity: 0.26, duration: 27, delay: -22, blur: 27 },
  { left: "59%",  width: 130, height: 56, rgb: RED,     opacity: 0.24, duration: 28, delay: -24, blur: 28 },
  { left: "10%",  width: 150, height: 60, rgb: MAGENTA, opacity: 0.24, duration: 29, delay: -20, blur: 27 },
  { left: "80%",  width: 150, height: 62, rgb: ICE,     opacity: 0.24, duration: 30, delay: -26, blur: 27 },
];

/**
 * VaporHeroScene — smoke-only hero backdrop.
 *
 * The entire scene IS the smoke: five tinted photographic smoke
 * textures (keyed PNGs) churn and drift across the frame, sixteen
 * LED-tinted vapor plumes rise on staggered loops, and three low fog
 * banks slide along the floor — all over a static neon colour wash.
 * The previous synthwave props (grid floor, striped sun, light beams,
 * glow orbs, particle motes) were removed; no non-smoke animation
 * remains. Motion is pure CSS transform/opacity — no JS per frame —
 * and the scene collapses to a calm static gradient under reduced
 * motion.
 */
export function VaporHeroScene() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
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
          LED channels. These carry the REAL vapor detail and are the
          only content of the scene. */}
      {!reduced && (
        <>
          <SmokeTexture asset="wisps" color="#8b5cf6" drift="churn-a" duration={58} delay={-12} opacity={0.55} width="95%" x={-20} y={10} />
          <SmokeTexture asset="plume" color="#ff2a54" drift="drift-b" duration={64} delay={-34} opacity={0.44} width="82%" x={24} y={16} flipX blur={1} />
          <SmokeTexture asset="wisps" color="#d75fd4" drift="drift-a" duration={60} delay={-28} opacity={0.36} width="78%" x={32} y={-12} flipX />
          <SmokeTexture asset="column" color="#a78bfa" drift="drift-c" duration={52} delay={-20} opacity={0.38} width="30%" x={-4} y={4} />
          <SmokeTexture asset="wisps" color="#6fd6f2" drift="fog-x" duration={50} delay={-6} opacity={0.32} width="130%" y={40} flipY />
        </>
      )}

      {/* Rising vapor plumes — the signature motion of the scene.
          The four lowest-opacity filler plumes are hidden below md to
          halve the blur-filter layer count on small/low-power devices. */}
      {PLUMES.map((plume, i) => (
        <div
          key={i}
          className={`absolute bottom-0 ${reduced ? "" : "anim-vapor"} ${i >= PLUMES.length - 4 ? "max-md:hidden" : ""}`}
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

      {/* Low fog banks — wide haze sliding laterally along the floor */}
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
      <div
        className={`absolute inset-x-[-16%] bottom-[22%] h-[11vh] ${reduced ? "" : "anim-fog-x"}`}
        style={{
          ["--dur" as string]: "42s",
          ["--delay" as string]: "-31s",
          background:
            "radial-gradient(50% 100% at 56% 100%, rgba(215,95,212,0.12), rgba(139,92,246,0.05) 60%, transparent 80%)",
          filter: "blur(21px)",
        }}
      />
    </div>
  );
}
