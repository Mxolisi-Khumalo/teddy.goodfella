import { getTheme } from '@/content'
import {
  BODY_TEXT_MIN,
  contrastRatio,
  LARGE_TEXT_MIN,
  saturationAndLightness,
} from '@/lib/contrast'

/**
 * Permanent dev tool. Not pretty, complete.
 *
 * Every token, every pair that the design actually uses, and its measured contrast
 * against the threshold that applies to that use. Server-rendered from the theme
 * content object, so it reports what the site will actually paint rather than what a
 * spreadsheet says.
 *
 * Deliberately not linked from anywhere in the site.
 */

type Usage = 'body' | 'large' | 'graphic' | 'unused'

interface Pair {
  readonly fg: keyof Palette
  readonly bg: keyof Palette
  readonly usage: Usage
  readonly where: string
}

interface Palette {
  readonly ink: string
  readonly paper: string
  readonly seal: string
  readonly carnival: string
  readonly muted: string
}

/**
 * Every pair the design uses, with the threshold that applies. `unused` rows are
 * here on purpose: they record a pair that WOULD fail and the rule that keeps it out
 * of the design, so nobody reintroduces it and wonders why contrast broke.
 */
const PAIRS: readonly Pair[] = [
  {
    fg: 'paper',
    bg: 'ink',
    usage: 'large',
    where: 'hero display type over the ink ground',
  },
  {
    fg: 'paper',
    bg: 'ink',
    usage: 'body',
    where: 'secondary text on the ink ground / footer',
  },
  {
    fg: 'seal',
    bg: 'ink',
    usage: 'graphic',
    where: 'foil mark or rule on the ink ground',
  },
  {
    fg: 'carnival',
    bg: 'ink',
    usage: 'graphic',
    where: 'carnival accent on the ink ground',
  },
  { fg: 'ink', bg: 'paper', usage: 'body', where: 'all body copy on a sheet' },
  {
    fg: 'muted',
    bg: 'paper',
    usage: 'body',
    where: 'secondary text and labels on a sheet',
  },
  { fg: 'ink', bg: 'seal', usage: 'body', where: 'CONFIRMED stamp text on a gold fill' },
  { fg: 'paper', bg: 'carnival', usage: 'large', where: 'SOLD OUT stamp text, 20px/700' },
  { fg: 'carnival', bg: 'paper', usage: 'graphic', where: 'focus ring on a sheet' },
  {
    fg: 'muted',
    bg: 'ink',
    usage: 'unused',
    where:
      'FORBIDDEN — muted is an on-paper token. Ink-ground secondary text uses paper.',
  },
  {
    fg: 'seal',
    bg: 'paper',
    usage: 'unused',
    where:
      'FORBIDDEN as a lone graphical object. A seal mark on a sheet carries a 1px ink outline; the gold is fill only.',
  },
]

const THRESHOLD: Record<Exclude<Usage, 'unused'>, number> = {
  body: BODY_TEXT_MIN,
  large: LARGE_TEXT_MIN,
  graphic: LARGE_TEXT_MIN,
}

export default async function StyleguidePage() {
  const theme = await getTheme()
  const palette: Palette = {
    ink: theme.palette.ink,
    paper: theme.palette.paper,
    seal: theme.palette.seal,
    carnival: theme.accentOverride ?? theme.palette.carnival,
    muted: theme.palette.muted,
  }

  const rows = PAIRS.map((pair) => {
    const ratio = contrastRatio(palette[pair.fg], palette[pair.bg])
    const required = pair.usage === 'unused' ? null : THRESHOLD[pair.usage]
    return {
      ...pair,
      ratio,
      required,
      passes: required === null ? null : ratio >= required,
    }
  })

  const failures = rows.filter((r) => r.passes === false)

  return (
    <main className="min-h-screen bg-ink p-8 font-mono text-paper">
      <h1 className="text-2xl font-bold">Styleguide</h1>
      <p className="mt-1 text-sm text-paper/70">
        Server-rendered from the theme content object. Palette signed off in PROJECT.md
        §5.
      </p>

      {/* --- headline verdict ------------------------------------------------- */}
      <section
        className="mt-6 border p-4"
        style={{
          borderColor: failures.length === 0 ? palette.seal : palette.carnival,
        }}
        data-testid="verdict"
      >
        {failures.length === 0 ? (
          <p>
            <strong>PASS</strong> — every pair the design uses meets its threshold.
          </p>
        ) : (
          <>
            <p>
              <strong>{failures.length} FAILING pair(s)</strong>
            </p>
            <ul className="mt-2 list-inside list-disc">
              {failures.map((f) => (
                <li key={`${f.fg}-${f.bg}-${f.usage}`}>
                  {f.fg} on {f.bg}: {f.ratio.toFixed(2)}:1, needs {f.required}:1 —{' '}
                  {f.where}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* --- tokens ----------------------------------------------------------- */}
      <h2 className="mt-10 text-lg font-bold">Tokens</h2>
      <table className="mt-3 w-full text-left text-sm" data-testid="tokens">
        <thead className="text-paper/60">
          <tr>
            <th className="py-2 pr-6">swatch</th>
            <th className="py-2 pr-6">role</th>
            <th className="py-2 pr-6">hex</th>
            <th className="py-2 pr-6">sat %</th>
            <th className="py-2 pr-6">light %</th>
            <th className="py-2">note</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(palette) as (keyof Palette)[]).map((role) => {
            const { saturation, lightness } = saturationAndLightness(palette[role])
            return (
              <tr key={role} className="border-t border-paper/15">
                <td className="py-2 pr-6">
                  <span
                    className="inline-block h-8 w-16 border border-paper/30"
                    style={{ backgroundColor: palette[role] }}
                  />
                </td>
                <td className="py-2 pr-6">{role}</td>
                <td className="py-2 pr-6">{palette[role].toUpperCase()}</td>
                <td className="py-2 pr-6">{saturation}</td>
                <td className="py-2 pr-6">{lightness}</td>
                <td className="py-2 text-paper/70">
                  {role === 'ink' && saturation > 15
                    ? 'chromatic navy, not a tinted near-black'
                    : role === 'muted'
                      ? 'on-paper only'
                      : role === 'seal'
                        ? 'graphic use only; never a lone object on paper'
                        : role === 'carnival'
                          ? 'sparing, graphic only, never body text'
                          : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* --- contrast panel --------------------------------------------------- */}
      <h2 className="mt-10 text-lg font-bold">Contrast, every pair actually used</h2>
      <table className="mt-3 w-full text-left text-sm" data-testid="contrast">
        <thead className="text-paper/60">
          <tr>
            <th className="py-2 pr-4">sample</th>
            <th className="py-2 pr-4">fg / bg</th>
            <th className="py-2 pr-4">ratio</th>
            <th className="py-2 pr-4">needs</th>
            <th className="py-2 pr-4">verdict</th>
            <th className="py-2">where</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.fg}-${r.bg}-${r.usage}`} className="border-t border-paper/15">
              <td className="py-2 pr-4">
                <span
                  className="inline-block px-3 py-1 text-sm font-bold"
                  style={{ backgroundColor: palette[r.bg], color: palette[r.fg] }}
                >
                  Ag
                </span>
              </td>
              <td className="py-2 pr-4">
                {r.fg} / {r.bg}
              </td>
              <td className="py-2 pr-4" data-testid={`ratio-${r.fg}-${r.bg}-${r.usage}`}>
                {r.ratio.toFixed(2)}:1
              </td>
              <td className="py-2 pr-4">
                {r.required === null ? '—' : `${r.required}:1`}
              </td>
              <td className="py-2 pr-4">
                {r.passes === null ? 'n/a' : r.passes ? 'pass' : 'FAIL'}
              </td>
              <td className="py-2 text-paper/70">{r.where}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- material discipline --------------------------------------------- */}
      <h2 className="mt-10 text-lg font-bold">Sheet, stamps and rules</h2>
      <p className="mt-1 text-sm text-paper/70">
        Square corners, zero radius, no shadows, 1px hairline ink rules. Sheets, not
        cards.
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-6">
        <div className="hero-notice">
          <p className="hero-notice__label">The register</p>
          <p className="hero-notice__line">Sheet on the ink ground.</p>
          <p className="hero-notice__ref">MCT-0000-000</p>
          <div className="hero-notice__actions">
            <span className="hero-stamp" data-stamp="confirmed">
              CONFIRMED
            </span>
            <span className="hero-stamp" data-stamp="sold out">
              SOLD OUT
            </span>
            <span className="hero-stamp" data-stamp="past">
              PAST
            </span>
          </div>
          <div className="hero-notice__actions">
            <a className="hero-notice__action" href="#focus-demo">
              Focusable action, tab to it
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
