import { Hero } from '@/components/hero/Hero'
import type { HeroNoticeContent } from '@/components/hero/HeroNotice'
import { getHeroLayers, getNextEvent, getPastEvents, getProfile } from '@/content'

/**
 * Phase 1 ships this route only (PROJECT.md §3).
 *
 * Data access happens here, in the route, and typed props go down to presentational
 * components — per the structure rule, `components/` never fetches.
 */
export default async function HomePage() {
  const [layers, profile, nextEvent, pastEvents] = await Promise.all([
    getHeroLayers(),
    getProfile(),
    getNextEvent(),
    getPastEvents(),
  ])

  /**
   * Resolved here rather than inside the component, so the component receives a
   * settled composition instead of having to decide what it is looking at.
   *
   * There is genuinely no upcoming engagement today — every recorded date is past —
   * so the `none` branch is the live one. It still carries a real record (the most
   * recent engagement, stamped PAST) plus the booking action, rather than rendering
   * an empty slot.
   */
  const notice: HeroNoticeContent =
    nextEvent !== null
      ? { kind: 'upcoming', event: nextEvent }
      : {
          kind: 'none',
          mostRecent: pastEvents[0] ?? null,
          bookingEmail: profile.bookingEmail,
        }

  return (
    <Hero
      layers={layers}
      name={profile.name}
      personaTitle={profile.personaTitle}
      notice={notice}
    />
  )
}
