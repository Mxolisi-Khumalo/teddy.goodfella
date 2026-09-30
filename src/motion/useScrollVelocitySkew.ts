'use client'

import type { RefObject } from 'react'

import { useReducedMotion } from './ReducedMotionProvider'
import { gsap, ScrollTrigger, useGSAP } from './register'

export interface ScrollVelocitySkewOptions {
  readonly target: RefObject<HTMLElement | null>
  /**
   * Degrees of skew at the clamp velocity. Small on purpose: this should register as
   * the material having weight, not as the page shearing.
   */
  readonly maxSkew?: number
  /** Velocity in px/s treated as maximum. Above this the skew is clamped. */
  readonly clampVelocity?: number
}

/**
 * Skews an element in proportion to scroll velocity, easing back to flat when scroll
 * stops.
 *
 * Deliberately NOT applied to everything that scrolls. CLAUDE.md is explicit that the
 * hero is the one orchestrated motion moment and that elsewhere motion answers a user
 * action — scrolling is such an action, but skewing every section would be the
 * scattered-effects failure the guardrail names. Reach for this on the ledger rows,
 * where a fast scroll should feel like riffling paper, and leave the rest flat.
 *
 * Reads velocity from ScrollTrigger rather than differencing scrollY by hand: it is
 * already computing this on the same tick as everything else, and a hand-rolled
 * version would be a second, differently-timed source of truth for the same number.
 *
 * `skewY` is a transform, so this stays on the compositor. Off under reduced motion.
 */
export function useScrollVelocitySkew({
  target,
  maxSkew = 4,
  clampVelocity = 2400,
}: ScrollVelocitySkewOptions): void {
  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const el = target.current

      if (prefersReducedMotion || el === null) {
        return
      }

      const toSkew = gsap.quickTo(el, 'skewY', { duration: 0.5, ease: 'power3.out' })

      // `getVelocity()` returns px/s, signed by direction.
      const trigger = ScrollTrigger.create({
        onUpdate: (self) => {
          const velocity = self.getVelocity()
          const clamped = gsap.utils.clamp(-clampVelocity, clampVelocity, velocity)
          toSkew((clamped / clampVelocity) * maxSkew)
        },
        // Snap back to flat the moment scrolling stops, rather than holding a lean.
        onScrubComplete: () => {
          toSkew(0)
        },
      })

      // onUpdate does not fire when scroll halts, so settle it on the ticker instead:
      // without this the element keeps its last skew until the next scroll event.
      let idle = 0
      const settle = () => {
        idle += 1
        if (idle > 8) {
          toSkew(0)
        }
      }
      const resetIdle = () => {
        idle = 0
      }

      window.addEventListener('scroll', resetIdle, { passive: true })
      gsap.ticker.add(settle)

      return () => {
        window.removeEventListener('scroll', resetIdle)
        gsap.ticker.remove(settle)
        trigger.kill()
      }
    },
    {
      dependencies: [prefersReducedMotion, maxSkew, clampVelocity, target],
      revertOnUpdate: true,
    },
  )
}
