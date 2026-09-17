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
      // TODO: all five values await confirmation of PROJECT.md section 5, which says
      // explicitly not to start visual work until the direction is confirmed. The
      // guardrails constrain them already: `ink` must read as document ink and not a
      // tinted near-black, and exactly one of hot Klopse pink or emerald is chosen
      // for `carnival`.
      ink: '',
      paper: '',
      seal: '',
      carnival: '',
      muted: '',
    },
  ],

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
