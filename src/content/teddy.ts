import { imageLadder, r2Url } from '@/lib/r2'

import type { SiteContent } from './types'

/**
 * The single tenant's content, as a typed fixture.
 *
 * Every value here traces to PROJECT.md section 2 (verified facts) or section 3
 * (information architecture). Nothing is invented: where a fact is not yet known
 * the field is null or empty with a TODO naming who or what unblocks it, because a
 * plausible-looking stand-in becomes production (CLAUDE.md hard rule 3).
 *
 * Phase 2 deletes this file. Nothing outside `./index` may import it.
 */

const TENANT_ID = 'teddy-goodfella'

export const teddyContent: SiteContent = {
  tenant: {
    id: TENANT_ID,
    slug: 'teddy-goodfella',
    name: 'Teddy Goodfella',
    // TODO: domain not registered yet (PROJECT.md section 7 budgets R200-350/year for
    // it). Phase 1 ships at his real domain, so this must be filled before launch.
    primaryDomain: '',
  },

  profile: {
    tenantId: TENANT_ID,
    name: 'Teddy Goodfella',
    personaTitle: 'Minister of Cape Town',
    tagline: 'Arts, content creator, dancer, musician, all-round entertainer',
    bio:
      'Teddy Goodfella is an MC, event host and content creator based in Philippi, ' +
      'Cape Town, originally from Pretoria. He performs as the Minister of Cape Town ' +
      'and works across arts, dance and music as an all-round entertainer. In 2025 he ' +
      "hosted Red Bull Turn It Up, the brand's first South African edition, " +
      'across Johannesburg, Durban and Cape Town.',
    homeCity: 'Cape Town',
    bookingEmail: 'teddygoodfellabookings@gmail.com',
    socials: [
      {
        platform: 'instagram',
        url: 'https://www.instagram.com/teddy.goodfella/',
        handle: '@teddy.goodfella',
      },
      {
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@teddy.goodfella',
        handle: '@teddy.goodfella',
      },
      {
        platform: 'youtube',
        url: 'https://www.youtube.com/@teddy.goodfella',
        handle: '@teddy.goodfella',
      },
    ],
  },

  theme: {
    tenantId: TENANT_ID,
    paletteId: 'gazette-carnival',
    accentOverride: null,
    // TODO: PROJECT.md section 5 names the roles ("a condensed grotesque with
    // bureaucratic character for display, a clean legible sans for body") but not the
    // families. Section 5 is a proposal awaiting sign-off, so picking fonts here would
    // be starting visual work early.
    displayFont: '',
    bodyFont: '',
  },

  // The curated catalogue the tenant's theme selects from.
  palettes: [
    {
      id: 'gazette-carnival',
      // Provisional name, tied to the unconfirmed section 5 concept ("state
      // bureaucracy collided with carnival").
      name: 'Gazette Carnival',
      // Signed off 2026-09-22 (PROJECT.md §5). Contrast for every pair actually used
      // is measured in NOTES.md; two usage rules fell out of it — `muted` is
      // on-paper only, and `seal` is never a lone graphical object on `paper`.
      ink: '#131A2E', // base ground. Deep document navy, 42% saturation — not a near-black.
      paper: '#EFEBE1', // sheets. Warm official stock, not cream.
      seal: '#C6A02E', // gold foil. Seals, stamps. Graphic use only.
      carnival: '#E23E76', // Klopse pink. Sparing, graphic only, never body text.
      muted: '#5C6475', // secondary text on paper.
    },
  ],

  /**
   * The three hero planes. Dimensions and byte sizes below are measured from the
   * actual objects in R2, not estimated.
   *
   * `blurDataUrl` values are generated from the real objects by
   * `scripts/generate-blur-placeholders.mjs`. Re-run it whenever a layer is
   * replaced — they are derived data, not authored.
   *
   * Note the deliberate split in the bucket: the masters sit at the root, the
   * generated responsive ladder under `hero/`. `url` therefore has no prefix and
   * `sources` does.
   */
  hero: {
    tenantId: TENANT_ID,
    foreground: {
      tenantId: TENANT_ID,
      id: 'hero-fg-teddy-cutout',
      url: r2Url('hero-fg-teddy-cutout.placeholder.webp'),
      alt: 'Teddy Goodfella performing, cut out from its background',
      // Portrait 3:4 — a figure, not a full-bleed plate. 234.0 kb.
      width: 1800,
      height: 2400,
      blurDataUrl:
        'data:image/webp;base64,UklGRjABAABXRUJQVlA4WAoAAAAQAAAADwAAFAAAQUxQSJEAAAARb6CgbSQUvwJmiIgA5WxaReUPhNta29bk/f8JJAvoAtgCTu3QO7VTO73T+wKxDXL+DZJp0BEi+h+a4FGDAJxrjax4RXZdBQAil953lrxOTQKofedZNQgiF9/bJCgKVijPWYGCHcppgiJpBbKnEEQugaxTQN363ovNXDdPXo/H++n+7/H4UvvrQ46Aa/3xMkcBAFZQOCB4AAAAcAMAnQEqEAAVAD7dWqZMqKUjojAIARAbiWoAADHsXci6cZgAAP51uWlpkcvYK7955p9ddNGWH27Ver5M8WC1bHltCkzmUYMdxP9WUV3C7Zw/j80mVWv8mA8UF7Cb/4sHlpyXwkIm32fsjgh1fbXf076/Pt+n4AAA',
      credit: null,
      source:
        'Placeholder supplied by Teddy, 2026-09. Awaiting the real camera cut-out (PROJECT.md §9).',
      // The generated 1800 rung is deliberately NOT listed: its AVIF is 298.2 KiB,
      // over the 250 KiB per-layer budget, and hard rule 4 treats that as a build
      // failure. 1350 (133.2 KiB) is the top rung actually served.
      sources: imageLadder('hero/hero-fg-teddy-cutout.placeholder', [540, 900, 1350]),
    },
    mid: {
      tenantId: TENANT_ID,
      id: 'hero-mid-stage',
      url: r2Url('hero-mid-stage.placeholder.webp'),
      alt: 'Stage lighting and haze',
      // 16:9, alpha channel present so it composites over the crowd plate. 85.2 kb.
      width: 2560,
      height: 1440,
      blurDataUrl:
        'data:image/webp;base64,UklGRroAAABXRUJQVlA4WAoAAAAQAAAADwAACAAAQUxQSEwAAAARV6CwbRsUFgcREbSshL80MIhtKwo0WBpABWgAFYywRLCCFTSCPe1wb0T/c99YowS6NnJANcVAThmMNqsW65qOvpjXgXIe9+/hA18AVlA4IEgAAACQAQCdASoQAAkAAwBSJYgCdADT/AAA+xYKZWaXwqHQEvl2zzocMLWwJ4Xz7uliICz+sI/H2FnjNkrsrH2jZWtII3gOzq8AAAA=',
      credit: null,
      source: 'Placeholder supplied by Teddy, 2026-09.',
      sources: imageLadder('hero/hero-mid-stage.placeholder', [768, 1280, 1920, 2560]),
    },
    back: {
      tenantId: TENANT_ID,
      id: 'hero-back-crowd',
      url: r2Url('hero-back-crowd-from-within.placeholder.webp'),
      alt: 'His crowd, seen from within the audience looking toward the stage',
      // 16:9, opaque. 236.2 KiB. Shot FROM WITHIN the audience facing the stage:
      // silhouetted backs of heads near, phones up, stage lit in the distance. The
      // viewpoint is the whole point — a plate shot from the performer's position
      // keeps the visitor on stage at 100% and contradicts the narrative.
      width: 2560,
      height: 1440,
      blurDataUrl:
        'data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAACQAQCdASoQAAkAAwBSJZQAAudZfggA/uxRtKDmUJNqJ+dlgQAAAA==',
      credit: null,
      source:
        'Placeholder supplied by Teddy, 2026-09, replacing an earlier plate shot from the stage. Awaiting the real from-within-the-crowd camera frame (PROJECT.md §9).',
      sources: imageLadder(
        'hero/hero-back-crowd-from-within.placeholder',
        [768, 1280, 1920, 2560],
      ),
    },
  },

  /**
   * Red Bull Turn It Up, 2025 — the brand's first South African edition and the
   * strongest proof point on the site.
   *
   * Dates are date-only: the sources give the day, not a start time. Venue is known
   * for the Johannesburg leg only. Flyers are null rather than blank assets; section
   * 9 lists the Red Bull assets as still needing clearance.
   */
  events: [
    {
      tenantId: TENANT_ID,
      id: 'rbtu-2025-johannesburg',
      reference: 'MCT-2025-001',
      title: 'Red Bull Turn It Up — Johannesburg',
      venue: 'Playground, Braamfontein',
      city: 'Johannesburg',
      country: 'South Africa',
      startsAt: '2025-02-22',
      endsAt: null,
      role: 'Host / MC',
      flyer: null,
      ticketUrl: null,
      status: 'past',
      lineup: [],
    },
    {
      tenantId: TENANT_ID,
      id: 'rbtu-2025-durban',
      reference: 'MCT-2025-002',
      title: 'Red Bull Turn It Up — Durban',
      venue: null,
      city: 'Durban',
      country: 'South Africa',
      startsAt: '2025-02-26',
      endsAt: null,
      role: 'Host / MC',
      flyer: null,
      ticketUrl: null,
      status: 'past',
      lineup: [],
    },
    {
      tenantId: TENANT_ID,
      id: 'rbtu-2025-cape-town',
      reference: 'MCT-2025-003',
      title: 'Red Bull Turn It Up — Cape Town Finale',
      venue: null,
      city: 'Cape Town',
      country: 'South Africa',
      startsAt: '2025-03-15',
      endsAt: null,
      role: 'Host / MC',
      flyer: null,
      ticketUrl: null,
      status: 'past',
      lineup: [],
    },
  ],

  // Empty on purpose. Section 2 records no published story, and the Press Office
  // route is Phase 3. Writing one would mean inventing the excerpt, body and
  // publish date that Story requires, and section 2 says not to invent biography.
  stories: [],
}
