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
 * Output format: AVIF for every plate. The alpha-noise floor that made
 * WebP lose to palette PNG is irrelevant to AVIF — it compresses the
 * same plates ~60% smaller at identical resolution (wisps: 195KB PNG →
 * 79KB AVIF, plume: 120KB WebP → 41KB, column: 126KB → 37KB).
 */
const PLATES: Array<{ file: string; out: string; width: number; gain: number }> = [
  { file: "smoke-raw-1.png", out: "smoke-plume.avif", width: 1200, gain: 1.12 },
  { file: "smoke-raw-2.png", out: "smoke-wisps.avif", width: 1200, gain: 1.18 },
  { file: "smoke-raw-3.png", out: "smoke-column.avif", width: 860, gain: 1.1 },
];

async function keyPlate({ file, out, width, gain }: (typeof PLATES)[number]) {
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
  // then transcode to AVIF on the smoothed input — the quantised alpha
  // gives AVIF a cleaner signal to predict than the raw keyed noise.
  const palettePng = await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9, palette: true, quality: 85, effort: 9 })
    .toBuffer();
  await sharp(palettePng).avif({ quality: 55, effort: 6 }).toFile(dst);

  const kb = (fs.statSync(dst).size / 1024).toFixed(0);
  console.log(`✓ ${out} — ${info.width}x${info.height}, ${kb} KB`);
}

for (const plate of PLATES) {
  await keyPlate(plate);
}
console.log("Smoke keying complete.");
