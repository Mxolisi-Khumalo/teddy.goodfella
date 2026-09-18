/**
 * Generates the `blurDataUrl` values for MediaAsset records in src/content/teddy.ts.
 *
 * CLAUDE.md's image rules require a blur placeholder on every image. These cannot be
 * authored by hand and are not derivable from the URL, so they are generated from the
 * real objects in R2 and pasted into the fixture.
 *
 * Run:  node scripts/generate-blur-placeholders.mjs
 *
 * 16px wide keeps each data URL to a few hundred bytes — small enough to inline in
 * content without troubling the payload budget. The blur hides resampling artefacts
 * that would otherwise look like noise at that size.
 */

import sharp from 'sharp'

const BASE =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
  'https://pub-960caae6ae364ea88e306376de83ca48.r2.dev'

const KEYS = [
  'hero-fg-teddy-cutout.placeholder.webp',
  'hero-mid-stage.placeholder.webp',
  'hero-back-crowd-from-within.placeholder.webp',
]

console.log(`sharp ${sharp.versions.sharp} | libvips ${sharp.versions.vips}\n`)

for (const key of KEYS) {
  const response = await fetch(`${BASE}/${key}`)

  if (!response.ok) {
    console.error(`  FAILED ${key} -> HTTP ${response.status}`)
    continue
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const meta = await sharp(buffer).metadata()

  const tiny = await sharp(buffer)
    .resize(16, null, { fit: 'inside' })
    .blur(1.2)
    .webp({ quality: 45, alphaQuality: 60 })
    .toBuffer()

  const dataUrl = `data:image/webp;base64,${tiny.toString('base64')}`

  console.log(key)
  console.log(
    `  source      ${meta.width}x${meta.height}  alpha=${meta.hasAlpha}  ${(buffer.length / 1024).toFixed(1)} KiB`,
  )
  console.log(`  placeholder ${tiny.length} B raw / ${dataUrl.length} chars`)
  console.log(`  ${dataUrl}\n`)
}
