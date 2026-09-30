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

## Mobile motion and device orientation

- **GSAP folds a pre-existing CSS offset into its own `x`/`y` channel and never lets
  go.** The foreground plane's 0% crop lived in CSS as `transform: translate(-18%,
14%)` so first paint would be right. GSAP decomposed it to `-75.24px/122.08px` on
  first touch; nothing in the timeline writes `x`/`y`, so that offset persisted
  through the entire scroll _on top of_ the `xPercent`/`yPercent` being animated. The
  plane was doubly offset at 0% and sat 75px left of centre at 100%.
  Switching the CSS to the independent `translate`/`scale` properties does **not**
  help — GSAP reads those too (it writes `translate: none; rotate: none; scale: none`
  alongside its transform precisely because it has taken them over). The fix is one
  `gsap.set(planes, { x: 0, y: 0 })` at timeline build: a `set`, never a tween, since
  the parallax layer owns that channel and a tween would fight its `quickTo` every
  frame.
  **It was invisible on desktop** because the cursor parallax overwrites `x`/`y` on
  the first pointer move. Touch has no pointer, which is the only reason it surfaced.
- **A seeked timeline silently kills a CSS reduced-motion frame.** `ScrollScene` used
  to seek to `progress(1)` under reduced motion, which writes inline transforms and
  opacities — and an inline style beats a stylesheet rule. So the hero's entire
  purpose-composed `@media (prefers-reduced-motion: reduce)` block was dead, including
  the rule keeping the name visible: `opacity: 1` in the sheet, `opacity: 0` inline.
  Hence `staticFrame="stylesheet"`, which builds no timeline at all. A scene that
  composes its own reduced-motion frame in CSS must opt out of seeking.
- **Orientation has no meaningful zero, so the baseline is captured, not assumed.**
  Reading posture is 45–70° of beta; normalising against 0 pins the hero to its
  extreme offset on load. The neutral point is the first sample, and it then follows
  the visitor at `RECENTRE_RATE` (~4s constant) because gyros drift and so do arms.
  Consequence worth knowing: the effect responds to _change_ in attitude, so a held
  tilt decays back to centre rather than parking at the edge. Measured 0.854 → 0.048
  over ~12s.
- **The permission gate is not iOS-only.** Chrome 141 also exposes
  `DeviceOrientationEvent.requestPermission`, and _resolves_ `'denied'` rather than
  rejecting when the sensor is unavailable. It also fires exactly one
  `deviceorientation` event with `beta`/`gamma` null after a denial — hence the null
  guard. Reading the decision passively via `navigator.permissions.query({ name:
'gyroscope' })` first is what keeps the tap-to-enable control off Android, where the
  permission is auto-granted. `query` never prompts, so this is compatible with "no
  permission prompt on load".
- **`vh` is the wrong unit for a full-screen hero on a phone.** It is mobile Safari's
  _large_ viewport, so a bottom-anchored booking CTA sits under the toolbar. `svh` is
  the small viewport and is stable; `dvh` would resize a pinned ScrollTrigger as the
  toolbar collapses.
- **Full-bleed planes need overscan once anything translates them.** `inset: 0` plus a
  parallax offset slides the plane's own edge into frame and exposes the ink ground.
  Overscan must be at least the largest amplitude: 2rem desktop, 0.875rem on touch
  (where the max offset is 26 × 0.45 = 11.7px, and 2rem there would be 16% more area
  for the compositor to move every frame for nothing).
- **The lean maths is verified in Node, not the browser** — `scripts/verify-lean.mjs`,
  18 checks, imports the `.ts` source directly via Node's type stripping so the
  asserted code is the shipped code. Necessary because the effect needs a gyroscope
  and applying it runs on GSAP's ticker, i.e. on rAF, which a non-composited tab
  suspends: the browser reports no movement whether the maths is right or wrong.

## Perf: measured 2026-09-30

- **Initial JS for `/` is 184.2 KiB gzipped on touch, 185.0 on desktop. Budget is
  200 KiB, so this passes** — but only just, and the headroom is ~15 KiB.
  Breakdown by chunk probe: react + react-dom 69.8, Next app-router runtime 47.1,
  GSAP + ScrollTrigger 43.3 + 3.7, our own motion code plus Lenis 8.7 + 2.1,
  turbopack runtime 3.7, misc 5.7.
- **Measure what the browser FETCHES, not what the HTML references.** Scraping
  `/_next/static/**.js` out of the served markup gives 222.8 KiB and a false budget
  failure: `0cz1d0mv5g_q7.js` (38.6 KiB gzip) is listed in the markup and never
  requested. The reliable method is `performance.getEntriesByType('resource')` in the
  live page, then gzip those files off disk.
- **The one reducible item is GSAP + ScrollTrigger + Lenis (~58 KiB).** First paint
  does not need any of it, because the 0% composition is pure CSS — effect-gating the
  motion layer the way `CursorLayer` is gated would leave ~126 KiB. Worth doing before
  real photography and Layout B eat the remaining headroom.
- **Hero imagery at 390px/DPR2 is 156.3 KiB over six requests** — back 34.4 + 9.9, mid
  17.4 + 12.2, fg 61.4 + 21.0 (sharp plate and soft twin per plane). Well inside the
  1.2 MB payload and 250 KiB per-layer budgets. These are the _placeholder_ plates;
  real photography will be heavier. At DPR 3 the sharp rungs step up to 1920
  (back 79.4, mid 28.0) and fg to 1350 (133.2).
- **The desktop cursor chunk is absent on touch.** Verified by diffing the fetched
  chunk set: 8 chunks at 390px, 9 at 1440px, and the difference is exactly
  `27ubzcrer78wu.js` (1.8 KiB raw / 0.8 KiB gzip), which contains `cursor__ring` and
  `has-custom-cursor`. **Do not probe for a chunk by source filename** — Turbopack
  hashes chunk names, so `/CustomCursor/.test(url)` is false on desktop too and looks
  like a pass. Diff the sets instead.
- **Scroll framerate on mobile is NOT measured and is still owed.** The browser pane
  reports `document.hidden: false` but delivers 0 rAF ticks in 1000ms — it is not
  being composited — so no frame timing is obtainable here, and `gsap.ticker` has no
  reachable manual tick (`window._gsap` is a per-element cache, not the core). Static
  screenshots and layout measurement work fine; anything frame-based does not.
