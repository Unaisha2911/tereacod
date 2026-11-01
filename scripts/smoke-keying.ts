/**
 * smoke-keying.ts — convert generated smoke plates (white smoke on
 * pure black) into TRUE transparent PNG overlays.
 *
 * Technique: luminance keying. For every pixel, alpha = luminance and
 * RGB is normalised to white, so the black backdrop disappears and the
 * remaining vapor is a clean white, alpha-graded texture. Resulting
 * PNGs can be tinted, blurred, scaled and blended (screen) freely in
 * CSS — perfect overlay layers for the neon smoke engine.
 *
 * Run: bun scripts/smoke-keying.ts
 */
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const SRC_DIR = path.resolve("scripts/smoke-src");
const OUT_DIR = path.resolve("public/smoke");

/**
 * Output formats: plume/column are noise-heavy but grayscale-friendly —
 * chroma-stripped WebP beats PNG (~7% smaller). Wisps has an alpha-noise
 * floor where WebP never wins, so it stays palette PNG.
 */
const PLATES: Array<{ file: string; out: string; width: number; gain: number; format: "png" | "webp" }> = [
  { file: "smoke-raw-1.png", out: "smoke-plume.webp", width: 1200, gain: 1.12, format: "webp" },
  { file: "smoke-raw-2.png", out: "smoke-wisps.png", width: 1200, gain: 1.18, format: "png" },
  { file: "smoke-raw-3.png", out: "smoke-column.webp", width: 860, gain: 1.1, format: "webp" },
];

async function keyPlate({ file, out, width, gain, format }: (typeof PLATES)[number]) {
  const src = path.join(SRC_DIR, file);
  const dst = path.join(OUT_DIR, out);

  const img = sharp(src).resize({ width, withoutEnlargement: true });
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const px = new Uint8Array(data);
  const FLOOR = 16; // backdrop noise threshold — anything below is transparent
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    // Luminance (max-channel keeps bright wisps; crushes the black bg)
    const lum = Math.max(r, g, b);
    let alpha = 0;
    if (lum > FLOOR) {
      // Normalised, gently gamma-lifted falloff with hard floor.
      const t = (lum - FLOOR) / (255 - FLOOR);
      alpha = Math.min(255, Math.round(Math.pow(t, 0.85) * 255 * gain));
    }
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    px[i + 3] = alpha;
  }

  // Palette PNG first (256-colour quantisation smooths sensor noise),
  // then transcode: chroma-stripped WebP on the smoothed input is ~7%
  // smaller than either codec on the raw key. WebP plates ship the
  // transcode; PNG plates ship the palette PNG directly.
  const palettePng = await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9, palette: true, quality: 85, effort: 9 })
    .toBuffer();
  if (format === "webp") {
    // Textures are luminance-keyed WHITE vapor — no chroma information, so
    // grayscale (CSP removal) + moderate quality is the right encoding.
    await sharp(palettePng).grayscale().webp({ quality: 75, alphaQuality: 85, effort: 6 }).toFile(dst);
  } else {
    await sharp(palettePng).toFile(dst);
  }

  const kb = (fs.statSync(dst).size / 1024).toFixed(0);
  console.log(`✓ ${out} — ${info.width}x${info.height}, ${kb} KB`);
}

for (const plate of PLATES) {
  await keyPlate(plate);
}
console.log("Smoke keying complete.");
