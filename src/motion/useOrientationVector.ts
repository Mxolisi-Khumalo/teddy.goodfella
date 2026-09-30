'use client'

import { useCallback, useRef, useState } from 'react'

import { useReducedMotion } from './ReducedMotionProvider'
import {
  useCoarsePointerCapability,
  usePointerCapability,
} from './usePointerCapability'
import type { Vector2, VectorSource } from './usePointerVector'
import { useGSAP } from './register'

/**
 * Where the visitor is in the permission flow. A union rather than a pair of
 * booleans because the states are genuinely exclusive and each one renders something
 * different: `prompt` shows an affordance, `denied` shows nothing and must never ask
 * again, `unsupported` must not even hint that tilting is a thing.
 */
export type OrientationStatus =
  | 'unsupported'
  | 'prompt'
  | 'requesting'
  | 'granted'
  | 'denied'

export interface OrientationVector {
  /** Normalised -1..1 lean, relative to how the phone is currently being held. */
  readonly vector: VectorSource
  /** True only while readings are actually arriving. */
  readonly active: boolean
  readonly status: OrientationStatus
  /**
   * Ask for sensor access. MUST be called from a user gesture — iOS rejects the
   * promise otherwise, and a rejection counts as a denial. No-op unless
   * `status === 'prompt'`.
   */
  readonly request: () => void
}

/**
 * Degrees of lean that map to the full -1..1 range.
 *
 * 16 is about a comfortable wrist rotation — enough that a deliberate tilt reaches
 * the extreme, small enough that the parallax responds to the way a phone moves
 * while someone is just holding it. A larger range makes the effect feel dead; a
 * smaller one makes it twitchy and seasick.
 */
const RANGE_DEGREES = 16

/**
 * How fast the neutral point follows the visitor, per sample.
 *
 * This is the important constant and it is not a smoothing filter — it is what makes
 * the effect respond to *change* in how the phone is held rather than to absolute
 * attitude. Two things break without it:
 *
 *  1. Nobody holds a phone flat. Reading posture is 45-70 degrees of beta, so
 *     normalising against zero would pin the hero to its extreme offset on load and
 *     leave it there. The neutral point has to be wherever the visitor already is.
 *  2. Device orientation drifts, and so does a human arm over the course of a scroll.
 *     A baseline captured once at mount is wrong within seconds.
 *
 * At roughly 60Hz this is a ~4s time constant: a flick of the wrist registers in
 * full, a sustained tilt decays back to centre rather than parking the image at the
 * edge. NEEDS A PASS ON REAL HARDWARE — like the cursor's spring lag, this is a feel
 * judgement I cannot make from a desktop with no sensor.
 */
const RECENTRE_RATE = 0.004

/** Light low-pass, per sample. Kills single-sample sensor spikes. ~0.09s constant. */
const SMOOTHING = 0.18

/** iOS 13+ gates the sensor behind a static method that is not in lib.dom. */
interface PermissionGate {
  requestPermission: () => Promise<'granted' | 'denied'>
}

/**
 * Returns the iOS permission gate if this browser has one, else null.
 *
 * Null is genuinely ambiguous and both meanings are handled: either the browser has
 * no sensor at all, or it has one that needs no permission (Android Chrome). The
 * caller distinguishes them by whether `DeviceOrientationEvent` exists.
 */
function permissionGate(): PermissionGate | null {
  if (typeof window === 'undefined') {
    return null
  }

  const ctor: unknown = window.DeviceOrientationEvent

  if (typeof ctor !== 'function' || !('requestPermission' in ctor)) {
    return null
  }

  const { requestPermission } = ctor as { requestPermission: unknown }

  return typeof requestPermission === 'function'
    ? (ctor as unknown as PermissionGate)
    : null
}

function hasSensorApi(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

/** Shortest signed distance between two angles, so 179 -> -179 is 2 and not -358. */
function wrapDegrees(delta: number): number {
  return (((delta + 180) % 360) + 360) % 360 - 180
}

function clampUnit(value: number): number {
  return value < -1 ? -1 : value > 1 ? 1 : value
}

function screenAngle(): number {
  if (typeof window === 'undefined') {
    return 0
  }

  return window.screen.orientation?.angle ?? 0
}

/**
 * Device orientation as a normalised lean vector — the mobile counterpart to
 * `usePointerVector`, and the second producer against the same `VectorSource` type.
 *
 * Everything downstream is unchanged: `useVectorParallax` consumes this exactly as it
 * consumes the pointer, so the amplitude model, the transform-channel discipline
 * (`x`/`y` only, never `xPercent`/`yPercent`) and the reduced-motion teardown are
 * shared rather than reimplemented for touch. That was the reason for splitting the
 * hook in P6.
 *
 * WHAT IS NOT SHARED, AND WHY
 * A pointer reports an absolute position inside a known box, so normalising it is
 * arithmetic. A gyroscope reports attitude, which has no meaningful zero — see
 * `RECENTRE_RATE`. That difference lives here, in the producer, which is precisely
 * what the seam is for.
 *
 * PERMISSION
 * Nothing is requested on load. On Android the sensor needs no permission and
 * attaches immediately; on iOS `status` is `prompt` and stays there until a caller
 * invokes `request()` from a real user gesture. A refusal is terminal for the
 * session — iOS will not re-prompt, so asking again would spend a tap on nothing.
 */
export function useOrientationVector(): OrientationVector {
  const vector = useRef<Vector2>({ x: 0, y: 0 })

  const isCoarse = useCoarsePointerCapability()
  const hasFinePointer = usePointerCapability()
  const prefersReducedMotion = useReducedMotion()

  /**
   * Fine pointer wins on a device that reports both. The cursor language already owns
   * the `x`/`y` channel on the hero planes there, and two `quickTo` instances writing
   * one transform component would fight every frame.
   */
  const eligible =
    isCoarse && !hasFinePointer && !prefersReducedMotion && hasSensorApi()

  const [granted, setGranted] = useState(false)
  const [denied, setDenied] = useState(false)
  const [requesting, setRequesting] = useState(false)

  // Read during render rather than stored in state: it is a property of the browser,
  // not of this component, and it cannot change.
  const gated = eligible && permissionGate() !== null

  const status: OrientationStatus = !eligible
    ? 'unsupported'
    : denied
      ? 'denied'
      : granted || !gated
        ? 'granted'
        : requesting
          ? 'requesting'
          : 'prompt'

  const request = useCallback(() => {
    const gate = permissionGate()

    if (gate === null) {
      return
    }

    setRequesting(true)

    gate
      .requestPermission()
      .then((result) => {
        if (result === 'granted') {
          setGranted(true)
        } else {
          setDenied(true)
        }
      })
      // A rejection is a refusal: iOS rejects when the call did not originate in a
      // user gesture, and there is no second chance either way.
      .catch(() => {
        setDenied(true)
      })
      .finally(() => {
        setRequesting(false)
      })
  }, [])

  const active = status === 'granted'

  useGSAP(
    () => {
      if (!active) {
        // Rest at neutral so a consumer that ignores `active` still gets the static
        // composition rather than a frozen offset.
        vector.current = { x: 0, y: 0 }
        return
      }

      // Baselines are captured from the first reading, not assumed. null means "not
      // yet seen a sample".
      let baseBeta: number | null = null
      let baseGamma: number | null = null
      let angle = screenAngle()

      const onOrientation = (event: DeviceOrientationEvent) => {
        const { beta, gamma } = event

        // Null on a device that reports the event but has no gyroscope. Bail rather
        // than treating a missing axis as zero, which would read as a hard lean.
        if (beta === null || gamma === null) {
          return
        }

        if (baseBeta === null || baseGamma === null) {
          baseBeta = beta
          baseGamma = gamma
          return
        }

        const dBeta = wrapDegrees(beta - baseBeta)
        const dGamma = wrapDegrees(gamma - baseGamma)

        // Follow the visitor's neutral point slowly. See RECENTRE_RATE.
        baseBeta += dBeta * RECENTRE_RATE
        baseGamma += dGamma * RECENTRE_RATE

        // beta and gamma are expressed in the device's natural frame, so they swap
        // and change sign as the screen rotates. Without this a phone held in
        // landscape gets its parallax axes transposed.
        //
        // Portrait is verified; the landscape cases are the conventional mapping and
        // are not verified on hardware. A sign error there inverts the direction of
        // an 8px offset, which is why this is worth shipping unverified.
        let x: number
        let y: number

        if (angle === 90) {
          x = -dBeta
          y = dGamma
        } else if (angle === 180) {
          x = -dGamma
          y = -dBeta
        } else if (angle === 270 || angle === -90) {
          x = dBeta
          y = -dGamma
        } else {
          x = dGamma
          y = dBeta
        }

        const targetX = clampUnit(x / RANGE_DEGREES)
        const targetY = clampUnit(y / RANGE_DEGREES)

        // Assignment only — no measurement, no layout read, no setState. Identical
        // discipline to the pointer handler: the rAF throttle lands downstream, in
        // useVectorParallax's ticker callback.
        vector.current.x += (targetX - vector.current.x) * SMOOTHING
        vector.current.y += (targetY - vector.current.y) * SMOOTHING
      }

      // Rotating the device changes the axis mapping AND invalidates the baseline,
      // since the visitor's grip has physically changed. Re-capture both.
      const onScreenChange = () => {
        angle = screenAngle()
        baseBeta = null
        baseGamma = null
      }

      window.addEventListener('deviceorientation', onOrientation, { passive: true })
      window.screen.orientation?.addEventListener('change', onScreenChange)

      return () => {
        window.removeEventListener('deviceorientation', onOrientation)
        window.screen.orientation?.removeEventListener('change', onScreenChange)
      }
    },
    { dependencies: [active], revertOnUpdate: true },
  )

  return { vector, active, status, request }
}
