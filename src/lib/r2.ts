/**
 * Cloudflare R2 — building media URLs from object keys.
 *
 * `MediaAsset.url` holds an absolute URL by decision, so this is not called at read
 * time. It is called where a MediaAsset is *authored* — the fixture today, and
 * whatever seeds Payload in Phase 2 — so the host lives in one place even though the
 * stored value is absolute.
 *
 * That matters because the host is temporary: today it is a rate-limited
 * `pub-<hash>.r2.dev` development URL and before launch it becomes a custom domain on
 * the bucket. Composing with this helper keeps that switch to an env change plus a
 * rebuild. Hardcoding the host into each record would make it a content migration.
 *
 * Read at module scope because `NEXT_PUBLIC_` values are inlined at build time.
 */
const PUBLIC_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

/**
 * Absolute URL for an R2 object key.
 *
 * Throws rather than returning a broken string: a missing base URL or an empty key
 * would otherwise render as a silently broken image, and the perf budget treats the
 * hero imagery as load-bearing. Fail where the mistake is, not three layers later.
 *
 * @param key Object key within the bucket, e.g. 'hero/crowd-back.avif'. Leading
 *            slashes are tolerated; path segments are URL-encoded.
 */
export function r2Url(key: string): string {
  if (PUBLIC_BASE === undefined || PUBLIC_BASE === '') {
    throw new Error(
      'NEXT_PUBLIC_R2_PUBLIC_URL is not set. Copy .env.example to .env.local and fill it in.',
    )
  }

  const trimmedKey = key.replace(/^\/+/, '')

  if (trimmedKey === '') {
    throw new Error('r2Url() was called with an empty object key.')
  }

  // Encode per segment so slashes stay path separators, but spaces and other unsafe
  // characters in a filename cannot produce an invalid URL.
  const encoded = trimmedKey.split('/').map(encodeURIComponent).join('/')

  return `${PUBLIC_BASE.replace(/\/+$/, '')}/${encoded}`
}
