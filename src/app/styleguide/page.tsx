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

/**
 * The type scale.
 *
 * Redaction constrains it: the family ships only 400 and 700, so the display cluster
 * cannot use the 500/600 steps the first draft assumed — a 600 would be a browser
 * synthesised weight, which is exactly the fake-bold the design would be paying a
 * foundry to avoid. Public Sans is variable 100-900 and takes any weight asked of it.
 *
 * The gap between the clusters is deliberate: nothing exists between 3.5rem and
 * 1.375rem, so a section cannot gradually escalate toward the hero.
 */
const SCALE = [
  {
    step: 'display-hero',
    size: 'clamp(4rem, 13vw, 10.5rem)',
    weight: 700,
    tracking: '-0.035em',
    leading: '0.84',
    family: 'display',
    note: 'hero name. LCP text.',
  },
  {
    step: 'display-1',
    size: 'clamp(2rem, 5vw, 3.5rem)',
    weight: 700,
    tracking: '-0.02em',
    leading: '0.94',
    family: 'display',
    note: 'section proclamations',
  },
  {
    step: 'display-2',
    size: '1.5rem',
    weight: 400,
    tracking: '0',
    leading: '1.2',
    family: 'display',
    note: 'persona line. 400 because Redaction has no 500.',
  },
  {
    step: 'stamp',
    size: '1.25rem',
    weight: 700,
    tracking: '0.08em',
    leading: '1',
    family: 'degraded',
    note: 'status stamps. 20px/700 clears the WCAG large-text threshold.',
  },
  {
    step: 'title',
    size: '1.375rem',
    weight: 600,
    tracking: '-0.005em',
    leading: '1.25',
    family: 'body',
    note: 'sheet headings',
  },
  {
    step: 'body',
    size: '1rem',
    weight: 400,
    tracking: '0',
    leading: '1.6',
    family: 'body',
    note: 'body copy',
  },
  {
    step: 'meta',
    size: '0.875rem',
    weight: 500,
    tracking: '0.005em',
    leading: '1.45',
    family: 'body',
    note: 'ledger rows and references. Tabular figures.',
  },
] as const

const FAMILY_VAR = {
  display: 'var(--font-display)',
  degraded: 'var(--font-display-degraded)',
  body: 'var(--font-body)',
} as const

const SPECIMEN = 'Teddy Goodfella — MCT-2025-003'

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

      {/* --- type scale ------------------------------------------------------- */}
      <h2 className="mt-10 text-lg font-bold">Type scale</h2>
      <p className="mt-1 text-sm text-paper/70">
        Redaction: 400 and 700 only — no variable font exists, so 500 and 600 are not
        available in the display cluster. Public Sans: variable 100–900.
      </p>

      <div className="mt-4 space-y-8" data-testid="type-scale">
        {SCALE.map((t) => (
          <div key={t.step} className="border-t border-paper/15 pt-4">
            <p className="text-xs text-paper/60">
              {t.step} · {t.size} · {t.weight} · tracking {t.tracking} · leading{' '}
              {t.leading} · {t.family} · {t.note}
            </p>
            <p
              className="mt-2 overflow-hidden"
              style={{
                fontFamily: FAMILY_VAR[t.family],
                fontSize: t.size,
                fontWeight: t.weight,
                letterSpacing: t.tracking,
                lineHeight: t.leading,
                fontVariantNumeric: t.step === 'meta' ? 'tabular-nums' : 'normal',
              }}
            >
              {t.family === 'degraded' ? 'CONFIRMED SOLD OUT PAST' : SPECIMEN}
            </p>
          </div>
        ))}
      </div>

      {/* --- both families at one size, for direct comparison ----------------- */}
      <h2 className="mt-10 text-lg font-bold">The two families, same size</h2>
      <div className="mt-4 space-y-4">
        {(
          [
            ['display', 'Redaction 400'],
            ['display', 'Redaction 700'],
            ['degraded', 'Redaction 20 · 700'],
            ['body', 'Public Sans 400'],
            ['body', 'Public Sans 700'],
          ] as const
        ).map(([family, label], i) => (
          <div key={label} className="border-t border-paper/15 pt-3">
            <p className="text-xs text-paper/60">{label}</p>
            <p
              className="mt-1"
              style={{
                fontFamily: FAMILY_VAR[family],
                fontSize: '2rem',
                fontWeight: i === 0 || i === 3 ? 400 : 700,
              }}
            >
              {family === 'degraded' ? 'CONFIRMED 2025' : 'Minister of Cape Town'}
            </p>
          </div>
        ))}
      </div>

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
