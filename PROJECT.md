# PROJECT.md — teddy.goodfella

Source of truth for what this project is. Read this before any task.
Conventions and hard rules live in `CLAUDE.md`. Read both.

---

## 1. What this is

An immersive personal site for **Teddy Goodfella**, a Cape Town MC, event host and
content creator who performs under the persona **"Minister of Cape Town"**.

Two audiences, two devices, both first-class:

| Audience | Device | Job of the site |
|---|---|---|
| His fans | Android phone, often prepaid mobile data | Find the next gig, buy tickets, feel his energy |
| Prospective platform clients (other creators, brands, agencies) | Desktop, mouse, good connection | Be visibly impressed enough to want one |

The second audience is why this is a portfolio piece. The first is why it must stay fast.

**Long-term:** this becomes a multi-tenant platform other creators rent. Every
architectural decision is made as if there are fifty tenants, even though there is one.

---

## 2. Verified facts about the subject

Use these. Do not invent biography.

- Handle `@teddy.goodfella` — consistent across Instagram, TikTok, YouTube
- Persona / tagline: **Minister of Cape Town**
- Based in Philippi, Cape Town. Originally from Pretoria.
- Self-describes as: arts, content creator, dancer, musician, all-round entertainer
- Bookings: `teddygoodfellabookings@gmail.com`
- **Headline credit:** host / MC of **Red Bull Turn It Up**, the brand's first South
  African edition, 2025. Johannesburg leg 22 Feb 2025 at Playground, Braamfontein.
  Series ran Joburg → Durban (26 Feb) → Cape Town finale (15 Mar). Credited in
  coverage as "MC Teddy Goodfella". Shot by Craig Kolesky for Red Bull Content Pool.
- Appeared on **Posties Podcast EP.34** — on being Minister of Cape Town, MCs vs DJs,
  amapiano.
- Content: short-form vlogs, lifestyle, travel, performance clips

The Red Bull credit is the strongest proof point on the site. Give it weight.

---

## 3. Information architecture

The persona drives the IA. Lean into the mock-ministry conceit — it is his own joke
and no template has this spine.

| Route | Ministry name | Contains | Phase |
|---|---|---|---|
| `/` | — | Hero, proof, next engagement, reel | 1 |
| `/engagements` | Official Engagements | Events calendar, past and upcoming | 3 |
| `/manifesto` | The Manifesto | Bio, what he does, booking | 3 |
| `/constituency` | Constituency | Map / list of cities performed in | 3 |
| `/press-office` | Press Office | Brand collabs, stories, announcements | 3 |

Phase 1 ships `/` only, live at his real domain.

---

## 4. The hero — the centrepiece

A **2.5D stage-to-crowd scroll reveal**. Depth comes from separated photographic
layers, not geometry. No Three.js scene, no 3D models, no Gaussian splats.

Three layers, scroll-driven:

```
      scroll 0%                          scroll 100%
  ┌──────────────────┐              ┌──────────────────┐
  │                  │              │  ·  ·  ·  ·  ·   │  ← crowd, scaled up,
  │      TEDDY       │              │ ·  ╷TEDDY╷  ·  · │    forward, sharp
  │   (foreground,   │    ───▶      │  ·  ·  ·  ·  ·   │
  │   sharp, large)  │              │   ·  ·  ·  ·  ·  │  ← Teddy small, hazed,
  └──────────────────┘              └──────────────────┘    distant on stage
   You are Teddy                     You are in the crowd
```

- **Foreground:** cut-out of Teddy, background removed. Scales down, blurs, desaturates slightly.
- **Mid:** stage elements, light beams, haze. Opacity and blur shift between states.
- **Back:** crowd photograph from a real gig. Scales up and forward, sharpens.

Cursor drives **counter-parallax** — each layer offsets at a different rate, foreground
most, background least. On mobile, device orientation drives the same offsets.

The narrative: the visitor starts as Teddy and ends as a member of his audience.

**Audio:** ~10 min ambient crowd loop, **muted by default**, one obvious tap/click to
enable. Never autoplay with sound. This is the cheapest wow on the whole list.

---

## 5. Design direction — PROPOSAL, confirm before building

Do not start visual work until the human confirms or replaces this.

**Concept: state bureaucracy collided with carnival.**

The persona is a fake government minister. So the visual language is official
paperwork — gazettes, stamps, seals, reference numbers, ledger rows — crashed into
the saturation of Cape Town carnival and club culture: Klopse satin, glitter, stage
lighting. Forms meet sequins. That collision is specific to him and is not a look you
would arrive at for any other brief.

**Palette (4–6 named values, to be pinned at build time):**

| Token | Role | Direction |
|---|---|---|
| `ink` | Base ground | Deep official document navy — near-black is banned, this must read as *ink* |
| `paper` | Surfaces, cards, document blocks | Warm official-stock off-white, not cream |
| `seal` | Primary accent | Metallic gold-foil, for stamps, seals, emphasis |
| `carnival` | Energy accent, used sparingly | Hot Klopse pink or emerald — one, not both |
| `muted` | Secondary text, rules | Desaturated ink |

**Type:** two families, clearly distinct. A condensed grotesque with signage or
bureaucratic character for display, used as an *active design element* at large sizes.
A clean, legible sans for body. Set a real type scale.

**Structural devices must encode information, not decorate.** Stamps carry status
(CONFIRMED / SOLD OUT / PAST). Reference numbers carry event IDs. Ledger rows carry
the calendar. If a device carries no information, cut it.

**Spend boldness in one place:** the hero. Everything around it stays quiet and
disciplined.

---

## 6. Stack

Verify latest stable versions at scaffold time rather than trusting pinned numbers here.

**Phase 1**
- Next.js, App Router, TypeScript strict
- Tailwind v4 — CSS-first `@theme`, which maps cleanly onto CSS-variable theming
- GSAP + ScrollTrigger (free for all plugins) and `@gsap/react` for `useGSAP`
- Lenis — smooth scroll
- OGL (~10kb) for the WebGL texture layer. **Not Three.js** — 150kb is indefensible
  for fullscreen quads on a prepaid-data audience.
- Cloudflare R2 for all media
- Vercel Hobby

**Phase 2**
- Payload CMS v3, self-hosted, embedded in this Next.js app
- Neon Postgres
- Payload S3 storage adapter → R2

**Later**
- Sentry
- Payload multi-tenant plugin

**Explicitly not in this project:** Three.js, React Three Fiber, drei, any splat
renderer, Polycam / Luma / Postshot, Payload Cloud, Supabase.

---

## 7. Budget: free tiers only

This constrains architecture, not just cost.

- **All heavy media on R2.** 10GB free, **zero egress**. Vercel Hobby caps at 100GB
  bandwidth/month — serving a 3MB hero image set from Vercel hits that at ~33k visits,
  and the entire point of this site is to be shared. Media from R2, HTML/JS from Vercel.
- **Neon over Supabase** — Supabase's free tier pauses after 7 days idle, which will
  bite a low-traffic site.
- **Vercel Hobby prohibits commercial use.** Fine for now, but it is a known migration
  trigger before Phase 5. Because media already lives on R2, that migration is cheap.
- Only unavoidable spend: the domain, ~R200–350/year. A portfolio piece on a
  `.vercel.app` subdomain undercuts the entire pitch.

---

## 8. Phases

| Phase | Scope | Est. |
|---|---|---|
| 1 | Hero experience, typed content, hardcoded data, live at his domain | ~3 wks |
| 2 | Payload behind it, Teddy's admin, swap data source | ~3 wks |
| 3 | Engagements, Manifesto, Constituency, Press Office | ~3 wks |
| 4 | Perf, SEO, OG cards, analytics | ~2 wks |
| 5 | Multi-tenant extraction | later |

~10–11 weeks at 5–10 hrs/week.

**Phase 1 ships without a CMS on purpose.** Content types are defined properly on day
one and the data sits in a typed fixture. Components only ever read from typed content,
never from hardcoded strings. Phase 2 swaps the data source from fixture to Payload
query and the component layer does not move.

---

## 9. Assets needed from Teddy

The gating dependency. Nothing in the hero can be finished without these.

- 3–5 performance shots **from a real camera** — not pulled off Instagram.
  Compressed social JPEGs look terrible at full-bleed hero scale and this is where
  otherwise good sites get ruined.
- Crowd photographs from front of stage, several angles
- One clean full-body shot on a plain background, for the cut-out
- ~10 min ambient crowd audio
- Event history: venue, city, date, role, for the calendar
- Red Bull Turn It Up assets if he can get them cleared

**Rights:** crowd photos contain identifiable people and flyers are often
third-party artwork. Confirm Teddy has the right to publish each asset before it
ships, and keep a note of the source per file.
