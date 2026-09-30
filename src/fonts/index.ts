import localFont from 'next/font/local'

/**
 * Self-hosted faces. No third-party request on the critical path.
 *
 * Built by `scripts/build-fonts.py` — subset to 104 codepoints (Latin basic plus the
 * punctuation the site renders), woff2, 42.2 KiB for all four. Both families are SIL
 * OFL 1.1 with no Reserved Font Name; `OFL-Redaction.txt` sits beside the files
 * because the licence requires it to travel with them.
 *
 * `display: 'swap'` is Next's default for the local loader but is stated explicitly
 * here — it is a requirement, not a preference, and a default can change.
 *
 * `adjustFontFallback` is DISABLED on every face here, deliberately.
 *
 * It only accepts 'Arial' | 'Times New Roman', and the face it generates is
 * `src: local("Arial")`. Neither font exists on Android — the device CLAUDE.md's perf
 * budget is measured on — so there the generated face never resolves, its overrides
 * never apply, and the swap shifts layout with exactly the CLS they were meant to
 * prevent. It fails silently, and only on the device that matters.
 *
 * Replaced by per-platform faces in `src/app/font-fallbacks.generated.css`, generated
 * by `scripts/generate-font-fallbacks.mjs` from real metrics — @capsizecss/unpack
 * reads the subset woff2, @capsizecss/metrics supplies the system tables. The
 * `fallback` arrays below list them Android-first so each platform resolves the
 * system face it actually has.
 */

/**
 * Display — headings, hero type.
 *
 * Redaction ships NO variable font: 21 static CFF faces, 7 optical grades x
 * {Regular 400, Italic 400, Bold 700}. So this takes exactly the two weights used.
 * No italic: nothing in the design sets display type in italic.
 *
 * Preloaded because the hero name is the LCP text. Note this preloads BOTH faces
 * (17.5 KiB), since `preload` is per-declaration and the hero uses 700 for the name
 * and 400 for the persona line. Preloading strictly the bold would mean splitting
 * this into two CSS families and losing automatic weight switching — available if
 * the 8.6 KiB matters more than that.
 */
export const displayFont = localFont({
  src: [
    { path: './redaction-regular.woff2', weight: '400', style: 'normal' },
    { path: './redaction-bold.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: true,
  variable: '--font-display',
  // Redaction is a high-contrast slab serif (PROJECT.md §5), so the fallback stack is
  // serif: a condensed sans substituting for it reflows the 96px headline on swap,
  // which is CLS the budget cannot absorb.
  // Android first: it is the budget device and the one Next cannot target at all.
  fallback: ['Redaction Fallback Noto', 'Redaction Fallback Times', 'serif'],
  adjustFontFallback: false,
})

/**
 * Display, degraded — stamps and seal overlays only.
 *
 * Redaction's optical grades run from 10 (subtlest) to 100 ("nearly illegible", per
 * the foundry). 20 is the first grade that reads as overprinted ink rather than as a
 * damaged file, which matters because a status stamp has to stay readable — it
 * carries information.
 *
 * Subset to uppercase, digits and three marks, which is the whole of CONFIRMED /
 * SOLD OUT / PAST / CANCELLED and a reference number. That is why it is 3.4 KiB.
 * Not preloaded: no stamp is visible at first paint.
 */
export const displayDegradedFont = localFont({
  src: [{ path: './redaction20-bold.woff2', weight: '700', style: 'normal' }],
  display: 'swap',
  preload: false,
  variable: '--font-display-degraded',
  fallback: [
    'Redaction Degraded Fallback Noto',
    'Redaction Degraded Fallback Times',
    'serif',
  ],
  adjustFontFallback: false,
})

/**
 * Body — body copy, ledger rows, UI.
 *
 * One variable face covers every weight the design uses (400/500/600/700). The
 * `weight: '100 900'` range is what makes the wght axis track CSS font-weight rather
 * than snapping to a single instance.
 *
 * The build script re-defaults the axis from 100 to 400 first. Public Sans ships with
 * wght defaulting to Thin, and Next derives its fallback metrics from the binary's
 * own hmtx — so an un-re-defaulted file has Arial matched against Thin widths and the
 * swap visibly shifts layout. CLS budget is 0.05 and that alone would spend it.
 *
 * Not preloaded: the body font is not the LCP text, and preloading it would compete
 * with the display face for early bandwidth on the throttled connection the perf
 * budget is measured on.
 */
export const bodyFont = localFont({
  src: [{ path: './public-sans-variable.woff2', weight: '100 900', style: 'normal' }],
  display: 'swap',
  preload: false,
  variable: '--font-body',
  fallback: ['Public Sans Fallback Roboto', 'Public Sans Fallback Arial', 'sans-serif'],
  adjustFontFallback: false,
})

/**
 * PROJECT.md §5 now names Redaction explicitly as "a serif with graded
 * print-degradation levels" and states that it supersedes the earlier "condensed
 * grotesque" direction, so spec and implementation agree. The fallback stacks below
 * are serif for exactly that reason.
 */
