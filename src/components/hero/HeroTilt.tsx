'use client'

import type { OrientationStatus } from '@/motion'

/**
 * The permission affordance, and nothing else.
 *
 * Only exists because a browser that gates the gyroscope will hand it over solely in
 * response to a real user gesture, so there has to be something to tap. Wherever the
 * permission has already been decided there does not: a control telling you to tilt a
 * hero that is already responding to tilt is clutter. So this renders for exactly two
 * statuses and `useOrientationVector` does the work of narrowing to them — including
 * reading the existing permission passively, which is what keeps this off Android,
 * where the sensor is auto-granted.
 *
 * A refusal is terminal. Neither iOS nor Chrome re-prompts within a session, so
 * leaving the control up would spend taps on a dialog that never opens. The hero is
 * complete without the effect, which is the point of the whole permission path:
 * parallax is the only thing lost, and the scroll choreography, the type and the
 * booking action are untouched.
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
