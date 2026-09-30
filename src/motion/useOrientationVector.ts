'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { createLeanState, integrateLean } from './lean'
import { useReducedMotion } from './ReducedMotionProvider'
import { useCoarsePointerCapability, usePointerCapability } from './usePointerCapability'
import type { Vector2, VectorSource } from './usePointerVector'
import { useGSAP } from './register'

/**
 * Where the visitor is in the permission flow. A union rather than a set of booleans
 * because the states are genuinely exclusive and each one renders something
 * different: `prompt` shows an affordance, `denied` shows nothing and must never ask
 * again, `unsupported` must not even hint that tilting is a thing.
 *
 * `checking` is distinct from `unsupported` on purpose. They would be interchangeable
 * for the affordance, which renders nothing either way, but not for a consumer that
 * substitutes something when the sensor is absent — collapsing them would make that
 * substitute flash for a frame on every device that then turns out to have one.
 */
export type OrientationStatus =
  'unsupported' | 'checking' | 'prompt' | 'requesting' | 'granted' | 'denied'

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

/** iOS 13+ gates the sensor behind a static method that is not in lib.dom. */
interface PermissionGate {
  requestPermission: () => Promise<'granted' | 'denied'>
}

/**
 * Returns the permission gate if this browser has one, else null.
 *
 * NOT an iOS test, though it was written as one. Measured in Chrome 141: it exposes
 * `DeviceOrientationEvent.requestPermission` as well, and resolves `'denied'` rather
 * than rejecting when the sensor permission is unavailable. So the gate is the
 * general case and "no gate" is the legacy one — which is why `requestSensorState`
 * below exists, to keep the tap-to-enable control off screens that do not need it.
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

/**
 * Reads the already-decided sensor permission WITHOUT asking for it.
 *
 * This is the difference between a hero that just works and one that demands a tap
 * first. Chrome auto-grants the gyroscope on a secure same-origin context, so
 * querying finds `granted` and the effect can attach with no affordance and no
 * interaction — while iOS, which does not expose `gyroscope` to the Permissions API
 * at all, throws and falls through to the tap path where it genuinely belongs.
 *
 * `query` is passive by specification: it reports state and never prompts. That is
 * what keeps this compatible with "no permission prompt on load".
 *
 * `'gyroscope'` is absent from lib.dom's `PermissionName`, so the cast is unavoidable
 * — and a browser that does not recognise the name rejects, which is handled.
 */
async function requestSensorState(): Promise<PermissionState | null> {
  if (typeof navigator === 'undefined' || navigator.permissions === undefined) {
    return null
  }

  try {
    const status = await navigator.permissions.query({
      name: 'gyroscope' as PermissionName,
    })

    return status.state
  } catch {
    return null
  }
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
 * Nothing is requested on load. What happens instead, in order:
 *
 *   1. No gate at all (older Android browsers) — attach immediately.
 *   2. Gate present — passively READ the decision via the Permissions API, which by
 *      specification never prompts. Chrome auto-grants the gyroscope on a secure
 *      same-origin context, so this is where Android lands: sensor attached, no
 *      affordance, no interaction.
 *   3. Permissions API does not know the name (iOS) or reports `prompt` — `status`
 *      becomes `prompt` and stays there until a caller invokes `request()` from a
 *      real user gesture.
 *
 * A refusal is terminal for the session. Neither iOS nor Chrome will re-prompt, so
 * asking twice would spend a tap on a dialog that never opens.
 *
 * Measured in Chrome 141 under touch emulation: the passive query answers `denied`
 * (no sensor hardware behind the emulator), the control never renders, and the hero
 * is the static composition — which is the same path a real refusal takes.
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
  const eligible = isCoarse && !hasFinePointer && !prefersReducedMotion && hasSensorApi()

  /**
   * One state variable, because these are stages of a single decision rather than
   * independent flags — and three booleans would permit `granted && denied`.
   * `checking` is the initial value so nothing renders during step 2 below; without
   * it Android would flash a tap-to-enable control for one frame before the passive
   * query came back granted.
   */
  const [decision, setDecision] = useState<
    'checking' | 'prompt' | 'requesting' | 'granted' | 'denied'
  >('checking')

  // Both read during render rather than stored: they are properties of the browser
  // and the device, not of this component.
  const gated = eligible && permissionGate() !== null

  const status: OrientationStatus = !eligible
    ? 'unsupported'
    : // No gate means no permission to ask for. Derived rather than pushed into
      // state, which keeps the effect below free of a synchronous setState.
      !gated
      ? 'granted'
      : decision

  // Step 2: read the existing decision without asking for one.
  useEffect(() => {
    if (!gated) {
      return
    }

    let cancelled = false

    void requestSensorState().then((state) => {
      if (cancelled) return

      // Guarded update: a visitor fast enough to tap before this resolves has
      // already produced a better answer than the query can give.
      setDecision((current) =>
        current !== 'checking'
          ? current
          : state === 'granted'
            ? 'granted'
            : state === 'denied'
              ? 'denied'
              : 'prompt',
      )
    })

    return () => {
      cancelled = true
    }
  }, [gated])

  const request = useCallback(() => {
    const gate = permissionGate()

    if (gate === null) {
      return
    }

    setDecision('requesting')

    gate
      .requestPermission()
      .then((result) => {
        setDecision(result === 'granted' ? 'granted' : 'denied')
      })
      // A rejection is a refusal: iOS rejects when the call did not originate in a
      // user gesture, and there is no second chance either way.
      .catch(() => {
        setDecision('denied')
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

      // Baselines are captured from the first reading, not assumed — see lean.ts.
      const lean = createLeanState()
      let angle = screenAngle()

      const onOrientation = (event: DeviceOrientationEvent) => {
        const { beta, gamma } = event

        // Null on a device that reports the event but has no gyroscope. Measured:
        // Chrome fires exactly one such event after a denied permission. Bail rather
        // than treating a missing axis as zero, which would read as a hard lean.
        if (beta === null || gamma === null) {
          return
        }

        integrateLean(lean, beta, gamma, angle)

        // Assignment only — no measurement, no layout read, no setState. Identical
        // discipline to the pointer handler: the rAF throttle lands downstream, in
        // useVectorParallax's ticker callback.
        vector.current.x = lean.x
        vector.current.y = lean.y
      }

      // Rotating the device changes the axis mapping AND invalidates the baseline,
      // since the visitor's grip has physically changed. Re-capture both.
      const onScreenChange = () => {
        angle = screenAngle()
        lean.baseBeta = null
        lean.baseGamma = null
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
