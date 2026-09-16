# CLAUDE.md

Working rules for this repo. `PROJECT.md` says what we're building. This says how.

---

## Hard rules

These are not preferences. Breaking one means the work gets reverted.

1. **Content is always typed, never hardcoded.** No component contains a literal
   string, image URL, colour, date or name belonging to Teddy. Everything comes from
   the typed content layer in `src/content/`. Phase 2 swaps the data source; if a
   component reads a literal, Phase 2 becomes a rewrite.

2. **Every content type carries `tenantId`.** There is one tenant today. Build the
   schema as if there are fifty. This rule *is* Phase 5.

3. **All heavy media is served from Cloudflare R2.** Never commit images, video or
   audio to the repo. Never serve them from the app host. No exceptions for "just
   this one placeholder" — placeholders become production.

4. **The perf budget is a build failure, not a guideline.** See below.

5. **Never autoplay audio with sound.** Muted by default, explicit user gesture to enable.

6. **`prefers-reduced-motion` is respected everywhere.** Every scroll animation,
   parallax effect and cursor interaction needs a reduced-motion path that is a
   legitimate static design, not a broken one.

7. **Ask before adding a dependency.** This project is deliberately lean. Propose it
   with a size figure and wait.

---

## Perf budget

Measured on a mid-range Android over throttled 4G, not on a desktop.

| Metric | Budget |
|---|---|
| LCP | < 2.5s |
| Initial JS, gzipped | < 200kb |
| Total initial payload incl. hero imagery | < 1.2MB |
| Hero image, per layer | < 250kb AVIF |
| CLS | < 0.05 |
| Scroll framerate, desktop | 60fps |
| Scroll framerate, mid Android | 30fps floor |

Image rules: AVIF with WebP fallback, correct responsive `srcset`, explicit
`width`/`height` on everything, blur placeholders. When images *are* the experience,
image optimisation *is* performance optimisation.

The WebGL layer is progressive enhancement. It loads after first paint, behind a
capability check, and the site is complete without it.

---

## Stack conventions

**Motion**
- Wrap every GSAP animation in `useGSAP` from `@gsap/react`, or `gsap.context()`.
  React StrictMode double-mounts in dev; uncleaned ScrollTriggers stack up and cause
  animations that get progressively faster or fire twice. This is the single most
  common bug in this codebase's problem space.
- Lenis and ScrollTrigger must be explicitly wired —
  `lenis.on('scroll', ScrollTrigger.update)` plus driving Lenis from GSAP's ticker.
  Without it scroll-linked animation drifts out of sync with the smooth scroll.
- `ScrollTrigger.refresh()` after any layout-affecting content load, especially images.
- Animate `transform` and `opacity`. Animating layout properties in a scroll handler
  is out of budget by definition.
- Any component touching `window`, `document` or `matchMedia` is a client component
  with a guard. This is an SSR app.

**Theming**
- Palettes are CSS custom properties, emitted server-side into a `<style>` tag from
  the theme content object, consumed via Tailwind v4 `@theme`. Never read theme in
  client JS on first paint — that is a hydration mismatch and a flash of wrong colour.
- Teddy will get curated palettes plus one accent slot, never a raw colour picker.
  Validate contrast server-side. Clients will make the site ugly if permitted.

**Structure**
```
src/
  app/            routes
  components/     presentational, no data fetching
  motion/         GSAP/Lenis/ScrollTrigger primitives and hooks
  webgl/          OGL shaders and canvas layer
  content/        types.ts, fixtures, accessors  ← the only place data lives
  lib/            utilities
```
Components take typed props. Data access happens in `content/` accessors. A component
that imports a fixture directly is wrong; it imports an accessor.

---

## Design guardrails

The brief is paying for a distinct visual identity. Confirm the direction in
`PROJECT.md` §5 with the human before any visual work.

**Avoid these — they are the tells of generated design, and they appear regardless of subject:**
- Warm cream background + high-contrast serif + terracotta accent
- Near-black background + one acid-green or vermilion accent
- Tracked-out ALL-CAPS eyebrow labels above every heading
- Accenting one word in a headline in a different colour or weight
- Meta strings joined with middle dots (`A · B · C`)
- `→` appended to link and button text
- Identical rounded cards with the same soft grey shadow, one border-radius on
  everything regardless of hierarchy
- Numbered markers `01 / 02 / 03` where the content is not actually a sequence
- Tinted near-blacks (`#0B0B0B`, `#111`) standing in for black
- Fade-and-slide-up entrance on every section

**Do instead:**
- One orchestrated motion moment lands harder than scattered effects. The hero is
  that moment. Elsewhere, motion answers a user action.
- Structural devices encode information. A stamp carries event status. A reference
  number carries an ID. If a device carries nothing, cut it.
- Spend boldness in one place and keep everything around it quiet.

---

## Definition of done

No task is complete until all of these pass:

1. `npm run build` succeeds with zero TypeScript errors. `strict: true`, no `any`,
   no `@ts-ignore`.
2. Lint and format clean.
3. **Screenshotted and visually verified** at 390px and 1440px via Playwright MCP or
   Chrome DevTools MCP. Do not report a visual task complete without looking at it.
4. Reduced-motion path checked by emulating `prefers-reduced-motion: reduce`.
5. Keyboard focus visible and logical on anything interactive.
6. Perf budget re-measured if the change touched the hero, media or bundle.

---

## Working style

- **One coherent chunk per task.** If a request spans several concerns, say so and
  propose a split rather than building all of it.
- **Read `PROJECT.md` and this file at the start of a session.** This project runs at
  5–10 hrs/week over months; sessions are far apart and context does not carry.
- **Flag drift.** If an instruction conflicts with a hard rule here, say so before
  implementing rather than silently picking one.
- **Do not scaffold ahead.** No stub files, no "we'll need this later" directories,
  no speculative abstractions. Phase 5 is a real plan, not a reason to build
  indirection now.
- Conventional commits, one logical change per commit.
- When you learn something about this codebase worth keeping — a gotcha, a fix, a
  measurement — append it to `NOTES.md`.
