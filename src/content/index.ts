/**
 * The public surface of the content layer.
 *
 * Components import from here and nowhere else: never from `./teddy`, which Phase 2
 * deletes. Every accessor is already async even though it currently reads a local
 * object, so swapping the fixture for a Payload query does not touch a call site.
 */

import { teddyContent } from './teddy'
import type {
  Event,
  IsoDateTime,
  Profile,
  ResolvedTheme,
  SiteContent,
  Story,
} from './types'

export type {
  ColourValue,
  Event,
  EventId,
  EventStatus,
  IsoDateTime,
  MediaAsset,
  MediaAssetId,
  Palette,
  PaletteId,
  Profile,
  ResolvedTheme,
  SiteContent,
  SocialLink,
  SocialPlatform,
  Story,
  StoryId,
  Tenant,
  TenantId,
  TenantScoped,
  Theme,
  Url,
} from './types'

/**
 * Today's single data source. Phase 2 replaces this constant with a Payload client
 * and the accessors below become queries.
 */
const content: SiteContent = teddyContent

/**
 * The parse boundary. ISO strings live in the data; a `Date` is only ever created
 * here, to compare instants.
 *
 * Throws rather than coercing: an unparseable date in content is an authoring error
 * that should fail the build, not silently sort an event into the wrong bucket.
 */
function instant(iso: IsoDateTime): number {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) {
    throw new Error(`Unparseable ISO date in content: '${iso}'`)
  }
  return ms
}

function nowIso(): IsoDateTime {
  return new Date().toISOString()
}

export async function getProfile(): Promise<Profile> {
  return content.profile
}

/**
 * The theme with its palette joined, ready to emit as custom properties. Throws on a
 * dangling `paletteId`: a missing palette should be a build error, not a site that
 * renders with no colours.
 */
export async function getTheme(): Promise<ResolvedTheme> {
  const { theme, palettes } = content
  const palette = palettes.find((candidate) => candidate.id === theme.paletteId)

  if (palette === undefined) {
    throw new Error(
      `Theme for tenant '${theme.tenantId}' references unknown paletteId '${theme.paletteId}'`,
    )
  }

  return {
    tenantId: theme.tenantId,
    palette,
    accentOverride: theme.accentOverride,
    displayFont: theme.displayFont,
    bodyFont: theme.bodyFont,
  }
}

/**
 * Events that have not yet happened, soonest first.
 *
 * Partitioned on `startsAt`, not on `status`: the date is the single source of truth
 * for whether something has happened. Cancelled events are included, because the
 * ledger should show a cancelled engagement with its stamp rather than quietly drop
 * it.
 *
 * `now` is injectable so this is testable and so a server render can pin a single
 * instant across several calls.
 */
export async function getUpcomingEvents(
  now: IsoDateTime = nowIso(),
): Promise<readonly Event[]> {
  const at = instant(now)

  return [...content.events]
    .filter((event) => instant(event.startsAt) >= at)
    .sort((a, b) => instant(a.startsAt) - instant(b.startsAt))
}

/** Events that have happened, most recent first. */
export async function getPastEvents(
  now: IsoDateTime = nowIso(),
): Promise<readonly Event[]> {
  const at = instant(now)

  return [...content.events]
    .filter((event) => instant(event.startsAt) < at)
    .sort((a, b) => instant(b.startsAt) - instant(a.startsAt))
}

/**
 * The next engagement to headline, or null when there is none.
 *
 * Skips cancelled events: unlike the ledger, this drives a "next up" slot, and
 * headlining something that is not happening is worse than showing nothing.
 */
export async function getNextEvent(now: IsoDateTime = nowIso()): Promise<Event | null> {
  const upcoming = await getUpcomingEvents(now)

  return upcoming.find((event) => event.status !== 'cancelled') ?? null
}

/** Published stories, most recent first. */
export async function getStories(): Promise<readonly Story[]> {
  return [...content.stories].sort(
    (a, b) => instant(b.publishedAt) - instant(a.publishedAt),
  )
}
