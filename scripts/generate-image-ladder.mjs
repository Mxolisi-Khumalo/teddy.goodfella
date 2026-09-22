/**
 * Generates the responsive AVIF + WebP ladder for the hero plates.
 *
 * CLAUDE.md's image rules require "AVIF with WebP fallback, correct responsive
 * srcset". next.config.ts sets `images.unoptimized` (hard rule 3 — media is served
 * from R2, never from the app host), so next/image will not build a ladder for us.
 * This does it ahead of time instead.
 *
 * SOURCE IS R2, NOT A LOCAL FOLDER. There is no /public and no local masters: hard
 * rule 3 forbids committing media, so the plates only exist in the bucket. The script
 * pulls each master down, resizes, encodes, and writes to ./dist-media/ — which is
 * gitignored, because these are derived and reproducible by re-running this.
 *
 * Output naming is `<basename>.<width>.<ext>` so a srcset can be built by string
 * concatenation from the base key and a width, with no manifest to keep in sync:
 *   hero-back-crowd-from-within.placeholder.1280.avif
 *
 * Run:  node scripts/generate-image-ladder.mjs
 * Then: upload ./dist-media/* to the bucket root. Uploading needs R2 write
 *       credentials, which this script deliberately does not want or hold.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import sharp from 'sharp'

const BASE = process.env.NEXT_PUBLIC_R2_MEDIA_URL

if (!BASE) {
  console.error('NEXT_PUBLIC_R2_MEDIA_URL is not set. Source it from .env.local.')
  process.exit(1)
}

const OUT_DIR = 'dist-media'

/**
 * Widths per plate.
 *
 * The landscape ladder starts at 768. Note that is 1.97x a 390px viewport rather
 * than exactly 2x — and in practice the back plane scales to 1.28 during the scroll,
 * so a 390px viewport at DPR2 wants ~998px and the browser will pick 1280 anyway.
 * 768 earns its place serving the small soft twin, whose layout box is 12.5% of the
 * plane.
 */
const PLATES = [
  {
    key: 'hero-back-crowd-from-within.placeholder.webp',
    widths: [768, 1280, 1920, 2560],
    alpha: false,
  },
  {
    key: 'hero-mid-stage.placeholder.webp',
    widths: [768, 1280, 1920, 2560],
    alpha: true,
  },
  {
    key: 'hero-fg-teddy-cutout.placeholder.webp',
    widths: [540, 900, 1350, 1800],
    alpha: true,
  },
]

// Quality is deliberately not tuned. These plates are placeholders that get thrown
// away when the real photography lands; the script is the artefact worth keeping.
// `effort: 3` keeps AVIF encoding of a 2560px plate to seconds rather than a minute.
const AVIF = { quality: 50, effort: 3 }
const WEBP = { quality: 72, alphaQuality: 80 }

await mkdir(OUT_DIR, { recursive: true })

const rows = []

for (const plate of PLATES) {
  const basename = plate.key.replace(/\.webp$/, '')

  process.stdout.write(`\n${plate.key}\n`)

  const response = await fetch(`${BASE}/${plate.key}`)

  if (!response.ok) {
    console.error(`  FAILED to fetch master -> HTTP ${response.status}`)
    continue
  }

  const master = Buffer.from(await response.arrayBuffer())
  const meta = await sharp(master).metadata()

  process.stdout.write(
    `  master ${meta.width}x${meta.height} alpha=${meta.hasAlpha} ${(master.length / 1024).toFixed(1)} KiB\n`,
  )

  if (plate.alpha && !meta.hasAlpha) {
    console.error('  WARNING: expected an alpha channel and the master has none.')
  }

  for (const width of plate.widths) {
    // Never upscale: a variant wider than the master would be bytes with no detail.
    if (meta.width && width > meta.width) {
      process.stdout.write(`  skip ${width} (wider than master)\n`)
      continue
    }

    const resized = sharp(master).resize(width, null, { fit: 'inside' })

    for (const [ext, encode] of [
      ['avif', (p) => p.avif(AVIF)],
      ['webp', (p) => p.webp(WEBP)],
    ]) {
      const buffer = await encode(resized.clone()).toBuffer()
      const filename = `${basename}.${width}.${ext}`
      await writeFile(join(OUT_DIR, filename), buffer)
      rows.push({ filename, width, format: ext, kb: buffer.length / 1024 })
      process.stdout.write(
        `    ${ext} ${width} -> ${(buffer.length / 1024).toFixed(1)} KiB\n`,
      )
    }
  }
}

// --- report ---------------------------------------------------------------------
const widest = Math.max(...rows.map((r) => r.filename.length), 8)
const line = '-'.repeat(widest + 26)

console.log(`\n${line}`)
console.log(
  `${'filename'.padEnd(widest)}  ${'width'.padStart(5)}  ${'fmt'.padEnd(4)}  ${'KiB'.padStart(8)}`,
)
console.log(line)

for (const r of rows) {
  console.log(
    `${r.filename.padEnd(widest)}  ${String(r.width).padStart(5)}  ${r.format.padEnd(4)}  ${r.kb.toFixed(1).padStart(8)}`,
  )
}

console.log(line)

const total = rows.reduce((sum, r) => sum + r.kb, 0)
const avif = rows.filter((r) => r.format === 'avif')
const webp = rows.filter((r) => r.format === 'webp')

console.log(`${rows.length} files, ${total.toFixed(1)} KiB total in ./${OUT_DIR}/`)
console.log(
  `  avif ${avif.length} files, ${avif.reduce((s, r) => s + r.kb, 0).toFixed(1)} KiB` +
    `   webp ${webp.length} files, ${webp.reduce((s, r) => s + r.kb, 0).toFixed(1)} KiB`,
)

const over = rows.filter((r) => r.kb > 250)
console.log(
  over.length === 0
    ? '  every variant is under the 250 KiB per-layer budget'
    : `  OVER the 250 KiB per-layer budget: ${over.map((r) => r.filename).join(', ')}`,
)
console.log(
  '\nNext: upload ./dist-media/* to the bucket root, then the srcset goes live.',
)
