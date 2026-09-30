'use client'

import type { RefObject } from 'react'

import {
  useOrientationVector,
  type OrientationStatus,
} from './useOrientationVector'
import { usePointerVector } from './usePointerVector'
import { useVectorParallax } from './useVectorParallax'

export interface InputParallaxOptions {
  /** Element the input is normalised against. Targets are found inside it. */
  readonly scope: RefObject<HTMLElement | null>
  /** Attribute marking a target; its value keys into `amplitudes`. */
  readonly attribute: string
  /** Per-key offset in px, read live so a timeline can tween them. */
  readonly amplitudes: RefObject<Record<string, number>>
  /** Vertical offset as a fraction of horizontal. */
  readonly yFactor?: number
}

export interface InputParallax {
  /** Where the visitor is in the orientation permission flow. */
  readonly orientation: OrientationStatus
  /** Ask for sensor access. Must be invoked from a user gesture. */
  readonly requestOrientation: () => void
}

/**
 * Amplitudes are scaled to just under half on a phone.
 *
 * The amplitudes are px and were tuned against a 1440px viewport, where 18px reads as
 * a depth cue of about 1.25% of the frame. Carried over literally to 390px the same
 * 18px is 4.6% — no longer a parallax hint but a visible slide, and on a screen held
 * at arm's length the whole plate appears to swim. Two things also make a phone less
 * tolerant than a mouse: a tilt has no resting position the way a stationary cursor
 * does, and a hand shakes.
 *
 * 0.45 keeps the strongest offset in the 8-12px range across the scroll, which is
 * still legible as depth when the planes separate. Like the cursor's spring lag, the
 * final number wants a pass on real hardware.
 */
const TOUCH_AMPLITUDE_SCALE = 0.45

/**
 * Counter-parallax driven by whatever input the device actually has.
 *
 * Both producers run; each one self-gates, and their gates are mutually exclusive by
 * construction (`useOrientationVector` stands down when a fine pointer is present),
 * so at most one is ever emitting. The chosen ref is handed to a single
 * `useVectorParallax`, which means one ticker callback and one set of `quickTo`
 * instances regardless of input — two consumers would be two tweens fighting over
 * the same transform component.
 *
 * Swapping `source` between renders is safe: the consumer reads it from a ref updated
 * in a layout effect rather than treating it as a dependency, so a device that gains
 * a mouse mid-session crosses over without tearing down the tween.
 *
 * This supersedes the pointer-only composition from P6. There is no caller that wants
 * pointer parallax but not orientation parallax, so offering the narrower hook as
 * well would just be a second way to get it half-wired.
 */
export function useInputParallax({
  scope,
  attribute,
  amplitudes,
  yFactor = 0.6,
}: InputParallaxOptions): InputParallax {
  const pointer = usePointerVector({ scope })
  const orientation = useOrientationVector()

  useVectorParallax({
    source: orientation.active ? orientation.vector : pointer.vector,
    scope,
    attribute,
    amplitudes,
    yFactor,
    scale: orientation.active ? TOUCH_AMPLITUDE_SCALE : 1,
    enabled: pointer.active || orientation.active,
  })

  return {
    orientation: orientation.status,
    requestOrientation: orientation.request,
  }
}
