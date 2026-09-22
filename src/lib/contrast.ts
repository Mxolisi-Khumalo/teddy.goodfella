/**
 * WCAG 2.1 relative luminance and contrast, plus the pass thresholds.
 *
 * Lives in lib rather than in the styleguide route because CLAUDE.md requires
 * contrast to be validated server-side — clients get curated palettes, and a palette
 * that fails has to be rejected before it renders, not flagged in a dev tool only.
 */

/** Minimum ratio for normal-size body text. */
export const BODY_TEXT_MIN = 4.5

/**
 * Minimum ratio for large text, UI components and graphical objects.
 * Large text means >=24px, or >=18.66px when bold.
 */
export const LARGE_TEXT_MIN = 3

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function parseHex(hex: string): readonly [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean

  const r = Number.parseInt(full.slice(0, 2), 16)
  const g = Number.parseInt(full.slice(2, 4), 16)
  const b = Number.parseInt(full.slice(4, 6), 16)

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    throw new Error(`Unparseable hex colour: '${hex}'`)
  }

  return [r, g, b]
}

/** WCAG relative luminance, 0–1. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio, 1–21. Order-independent. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Saturation and lightness, for proving a value is chromatic rather than a tinted
 * near-black — which the design guardrails name as a tell.
 */
export function saturationAndLightness(hex: string): {
  readonly saturation: number
  readonly lightness: number
} {
  const [r, g, b] = parseHex(hex).map((v) => v / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const lightness = (max + min) / 2
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

  return {
    saturation: Math.round(saturation * 100),
    lightness: Math.round(lightness * 100),
  }
}
