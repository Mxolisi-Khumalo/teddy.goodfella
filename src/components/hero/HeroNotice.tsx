import type { Event } from '@/content'

/**
 * What the hero's final state hands over to: the engagement detail and the action.
 *
 * A discriminated union rather than a nullable event, because "there is an upcoming
 * engagement" and "there is not" are different compositions with different actions,
 * not the same composition with a missing field. `EventStatus` has no value meaning
 * "nothing is gazetted" — that is a property of the register, not of an event — so it
 * cannot be expressed as a status and has to live here.
 */
export type HeroNoticeContent =
  | { readonly kind: 'upcoming'; readonly event: Event }
  | {
      readonly kind: 'none'
      /** Most recent past engagement, so the notice still carries a real record. */
      readonly mostRecent: Event | null
      readonly bookingEmail: string
    }

function formatDate(iso: string): string {
  // Date-only ISO strings parse as UTC midnight; formatting in UTC keeps the
  // rendered day identical on the server and the client.
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

function Stamp({ label }: { label: string }) {
  return (
    <span className="hero-stamp" data-stamp={label.toLowerCase()}>
      {label}
    </span>
  )
}

/**
 * Sits on an opaque surface rather than directly over photography: the brief requires
 * this to stay legible at 100%, and the plate underneath is a crowd shot whose
 * luminance moves as it scales and sharpens. An opaque ground is the only way to hold
 * a contrast ratio that does not depend on which part of the photograph is behind it.
 */
export function HeroNotice({ content }: { content: HeroNoticeContent }) {
  if (content.kind === 'upcoming') {
    const { event } = content
    return (
      <div className="hero-notice" data-variant="upcoming">
        <p className="hero-notice__label">Next engagement</p>
        <p className="hero-notice__ref">{event.reference}</p>
        <p className="hero-notice__line">
          {formatDate(event.startsAt)} — {event.venue ?? event.city}
        </p>
        <p className="hero-notice__line">{event.city}</p>
        <div className="hero-notice__actions">
          <Stamp label={event.status === 'sold-out' ? 'SOLD OUT' : 'CONFIRMED'} />
          {event.ticketUrl !== null && (
            <a className="hero-notice__action" href={event.ticketUrl}>
              Book tickets
            </a>
          )}
        </div>
      </div>
    )
  }

  const { mostRecent, bookingEmail } = content

  return (
    <div className="hero-notice" data-variant="none">
      <p className="hero-notice__label">The register</p>
      <p className="hero-notice__line">No engagement currently gazetted.</p>
      {mostRecent !== null && (
        <>
          <p className="hero-notice__ref">{mostRecent.reference}</p>
          <p className="hero-notice__line">
            {formatDate(mostRecent.startsAt)} — {mostRecent.city}
          </p>
          <div className="hero-notice__actions">
            <Stamp label="PAST" />
          </div>
        </>
      )}
      <div className="hero-notice__actions">
        <a className="hero-notice__action" href={`mailto:${bookingEmail}`}>
          Enquire about a booking
        </a>
      </div>
    </div>
  )
}
