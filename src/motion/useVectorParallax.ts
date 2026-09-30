'use client'

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

import { useReducedMotion } from './ReducedMotionProvider'
import { gsap, useGSAP } from './register'
import type { VectorSource } from './usePointerVector'

const useIsomorphicLayoutEffect =
  typeof document !== 'undefined' ? useLayoutEffect : useEffect

export interface VectorParallaxOptions {
  /**
   * Any normalised -1..1 source. Pointer today, device orientation in P7 — the
   * consumer does not and should not know which.
   */
  readonly source: VectorSource
  /** Container searched for targets. */
  readonly scope: RefObject<HTMLElement | null>
  /**
   * Attribute marking a target. Its value is the key looked up in `amplitudes`, so
   * each target moves at its own rate — which is what reads as depth rather than as
   * one sliding image.
   */
  readonly attribute: string
  /**
   * Per-key offset in px, read live. A ref so a scroll timeline can tween these
   * without re-running this hook: the amplitudes and the visual state they describe
   * then cannot drift apart.
   */
  readonly amplitudes: RefObject<Record<string, number>>
  /** Vertical offset as a fraction of horizontal. Under 1 keeps the motion lateral. */
  readonly yFactor?: number
  /**
   * Multiplier over every amplitude, read live.
   *
   * Exists because the amplitudes are in px and describe a depth cue, so the same
   * number means something different on a 390px screen than on a 1440px one — and
   * the input that produces it differs too. Kept separate from `amplitudes` because
   * a scroll timeline owns those; this is the caller's own scaling and must not be
   * clobbered by a tween.
   */
  readonly scale?: number
  /** Disable without unmounting — e.g. while a scene is off screen. */
  readonly enabled?: boolean
}

/**
 * Counter-parallax: targets offset *against* the input, each at its own rate.
 *
 * Writes `x`/`y` only, per the transform-channel rule in CLAUDE.md — a scroll
 * timeline owns `scale`, `opacity`, `xPercent` and `yPercent` on the same elements,
 * and GSAP tracks those as separate components of one transform. That is what lets
 * each target be a single promoted layer instead of a nested wrapper, and a wrapper
 * whose child also scales forces the parent's whole tile set to repaint every frame.
 *
 * Applied on GSAP's ticker via `quickTo`, which reuses one tween per element per
 * axis. The input producer only assigns numbers; this is where the rAF throttle
 * actually lands.
 */
export function useVectorParallax({
  source,
  scope,
  attribute,
  amplitudes,
  yFactor = 0.6,
  scale = 1,
  enabled = true,
}: VectorParallaxOptions): void {
  const prefersReducedMotion = useReducedMotion()
  const live = enabled && !prefersReducedMotion

  // Everything here is read through a ref rather than declared as a dependency, so a
  // caller can swap the input source or rescale it mid-session — a tablet gaining a
  // mouse — without tearing down and rebuilding the tweens.
  const latest = useRef({ source, amplitudes, yFactor, scale })

  useIsomorphicLayoutEffect(() => {
    latest.current = { source, amplitudes, yFactor, scale }
  }, [source, amplitudes, yFactor, scale])

  useGSAP(
    () => {
      const host = scope.current

      if (!live || host === null) {
        return
      }

      const targets = Array.from(host.querySelectorAll<HTMLElement>(`[${attribute}]`))

      if (targets.length === 0) {
        return
      }

      const setters = targets.map((el) => ({
        key: el.getAttribute(attribute) ?? '',
        x: gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power2.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power2.out' }),
      }))

      const apply = () => {
        const { source: src, amplitudes: amps, yFactor: yf, scale: k } = latest.current
        const v = src.current

        if (v === null) return

        for (const setter of setters) {
          const amplitude = (amps.current?.[setter.key] ?? 0) * k
          setter.x(-v.x * amplitude)
          setter.y(-v.y * amplitude * yf)
        }
      }

      gsap.ticker.add(apply)

      return () => {
        gsap.ticker.remove(apply)
      }
    },
    { dependencies: [live, attribute, scope], revertOnUpdate: true },
  )
}
