'use client'

import type { OrientationStatus } from '@/motion'

/**
 * The iOS permission affordance, and nothing else.
 *
 * iOS 13+ will only hand over the gyroscope in response to a real user gesture, so
 * there has to be something to tap. Everywhere else there does not: Android grants
 * the sensor without asking, and a control telling you to tilt a hero that is already
 * responding to tilt is clutter. So this renders for exactly one status — `prompt` —
 * and is absent on desktop, absent on Android, and absent the moment the question has
 * been answered either way.
 *
 * A refusal is terminal. iOS will not re-prompt for the session, so leaving the
 * control up would spend taps on a dialog that never appears. The hero is complete
 * without the effect, which is the point of the whole permission path: parallax is
 * the only thing lost, and the scroll choreography, the type and the booking action
 * are untouched.
 */
export function HeroTilt({
  status,
  onRequest,
}: {
  readonly status: OrientationStatus
  readonly onRequest: () => void
}) {
  if (status !== 'prompt' && status !== 'requesting') {
    return null
  }

  return (
    <button
      type="button"
      className="hero-tilt"
      onClick={onRequest}
      disabled={status === 'requesting'}
    >
      Tilt to look around
    </button>
  )
}
