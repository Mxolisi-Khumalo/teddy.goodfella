# Notes

## Design direction — §5 signed off 2026-09-22

**Layout B, "The Filing".** Separate sheets on the ink ground with ink visible between
them, built with A's material discipline: square corners, zero border-radius, no
shadows, 1px hairline ink rules only. Sheets, not cards.

Why B over A:

- The hero's 100% notice is already a light opaque plate on dark moving photography.
  B extends that language; A abandons it one scroll after establishing it.
- B degrades better under multi-tenancy. Tenant two, with three events and no marquee
  credit, is simply fewer sheets. A single gazette with thin content reads unfinished.

**Cut from B:** "width encodes record class" as a _stated system_. The varying widths
stay as visual hierarchy — credit full width, slip narrowest — but there is no legend
and no labelling implying the widths are decodable. It only ever transmitted to us, so
it was not encoding anything.

**Polarity: dark ground. Structural and locked.** The notice requires a light plate
over moving photography, the hero ends dark, and the page stays dark ground from hero
to footer. Not to be reopened.

**Hero text gap at p≈0.45–0.55 is deliberate.** That frame is where the viewer stops
being Teddy and becomes someone watching him. Text there fights the only thing the
hero is about.

## Palette contrast — measured, not assumed

Tokens: `ink #131A2E`, `paper #EFEBE1`, `seal #C6A02E`, `carnival #E23E76`,
`muted #5C6475`. `ink` is 42% saturation at 13% lightness — a chromatic navy, not a
tinted near-black (`#111` would be 0% saturation).

Two constraints fell out of the maths and are now usage rules:

- **`muted` is an on-paper token only.** `muted` on `paper` is 4.99:1; on `ink` it is
  2.91:1 and fails body text. No single lightness can serve both grounds — passing on
  paper needs L≤40, passing on ink needs L≥55. Secondary text on the ink ground uses
  `paper`, not `muted`.
- **`seal` is never a lone graphical object on `paper`.** `seal` on `paper` is 2.08:1,
  under the 3:1 needed for a UI/graphical object. A seal mark on a sheet therefore
  always carries a 1px ink outline, which is what carries the shape (14.52:1); the
  gold is fill. `ink` on `seal` is 6.97:1, so stamp text on a gold fill is fine.
  If gold _rules_ on paper are ever wanted, the only lightness satisfying all three of
  seal/paper ≥3, seal/ink ≥3 and ink/seal ≥4.5 is **`#A18121`** — hsl(45 66% 38%) —
  giving 3.11 / 4.67 / 4.67 with just +3.7% worst-case margin, and it reads as dark
  bronze rather than foil. Swept at 0.25% lightness steps; the satisfying band is one
  step wide.

## Toolchain ceilings

- **TypeScript is pinned to 6.0.3, not 7.x.** No released `typescript-eslint` accepts
  TS 7 — 8.70.0 still peers `typescript >=4.8.4 <6.1.0` — and
  `node_modules/typescript-eslint/dist/index.js` throws
  `typescript-eslint does not support TS 7.0.` at module load. `npm i -D typescript@latest`
  succeeds with only a generic ERESOLVE warning, so the trap is quiet. Upgrade trigger:
  typescript-eslint widening its peer range.
- **ESLint is pinned to 9.39.5, not 10.x.** ESLint 10 hard-crashes with
  `TypeError: contextOrFilename.getFilename is not a function` in
  `eslint-plugin-react@7.37.5`, which `eslint-config-next@16` depends on. 9.39.5
  carries a "no longer supported" deprecation notice, so this is a known trade-off.
  Upgrade trigger: `eslint-config-next` bumping its plugin set past ESLint 9.

## Motion gotchas, each found the hard way

- **`useGSAP` defers cleanup unless you ask it not to.** Source:
  `deferCleanup = dependencies && dependencies.length && !revertOnUpdate`. Passing
  dependencies _without_ `revertOnUpdate: true` keeps the previous ScrollTrigger alive
  on every dependency change — the exact stacking bug in CLAUDE.md. Set it always.
- **Lenis rides `gsap.ticker`, so scroll-linked motion stops when the page is not
  painting.** Correct behaviour (no cycles animating an unpainted page) but it means a
  hidden document cannot verify scroll animation at all: `document.hidden === true`
  suspends rAF by spec, ScrollTrigger defers updates to rAF, and a scrubbed timeline
  never advances. `timeline.progress()` renders _synchronously_, which is why the
  `?heroProgress=` harness works regardless.
- **Complementary opacity cross-fades dim the image.** Fading `sharp 0→1` while
  `soft 1→0` composites to 75% coverage at the midpoint (`0.5 + 0.5×(1−0.5)`), so the
  ground shows through. Pin the bottom node opaque and animate only the top one.
- **Blur placeholders are wrong on alpha images.** `blurDataUrl` renders as a
  background, so behind a cut-out it shows a blurred rectangle through every
  transparent pixel and keeps showing it after load. Only the opaque plate gets one.

## Media pipeline measurements

- **AVIF can be larger than WebP when alpha is involved.** The foreground cut-out at
  1800px encodes to 298.2 KiB AVIF but 265.0 KiB WebP at `quality: 50, effort: 3` —
  AVIF's alpha is a separate encoded plane and the soft matte costs more there. The
  1800 rung is excluded from the served ladder because 298.2 KiB breaches the 250 KiB
  per-layer budget.
- **The LCP element is the soft twin, not the plate.** At 0% the visible node on the
  back plane is the 12.5%-box twin, so `sizes="16vw"` resolves it to the 768 rung
  (9.9 KiB AVIF) while the 230 KiB sharp plate stays `fetchPriority="low"` — nothing
  needs it sharp until ~44% of the scroll.
- **`next/image` cannot render `<picture>`/`<source>`**, so it cannot express
  AVIF-primary with WebP fallback. The hero planes use a raw `<picture>`;
  `@next/next/no-img-element` exempts `<img>` inside `<picture>`, so no disable is
  needed.
