'use client'

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

import { useReducedMotion } from './ReducedMotionProvider'
import { gsap, useGSAP } from './register'

const useIsomorphicLayoutEffect =
  typeof document !== 'undefined' ? useLayoutEffect : useEffect

export interface CursorParallaxOptions {
  /** Element whose pointer movement drives the effect. Targets are found inside it. */
  readonly scope: RefObject<HTMLElement | null>
  /**
   * Attribute marking a target. Its value is the key looked up in `amplitudes`, so
   * different targets can move at different rates — which is what makes it read as
   * depth rather than as a single sliding image.
   */
  readonly attribute: string
  /**
   * Per-key offset in px, read live on every pointer event. A ref rather than a prop
   * so a scroll timeline can tween these values without re-running this hook: the
   * amplitudes and the visual state they describe then cannot drift apart.
   */
  readonly amplitudes: RefObject<Record<string, number>>
  /** Vertical offset as a fraction of horizontal. Below 1 keeps the motion lateral. */
  readonly yFactor?: number
}

/**
 * Cursor-driven counter-parallax: targets offset *against* the pointer, each at its
 * own rate.
 *
 * Writes `x`/`y` only. A scroll timeline is free to write `xPercent`/`yPercent` and
 * `scale` on the same elements, because GSAP tracks those as separate components of
 * one transform. That is what lets each target be a single promoted layer instead of
 * needing a nested wrapper — and a wrapper whose child also scales forces the
 * parent's entire tile set to repaint every frame.
 *
 * Uses `quickTo`, which reuses one tween per element per axis rather than allocating
 * a new tween on every pointer event.
 *
 * Does nothing when reduced motion is set: hard rule 6 covers cursor interactions,
 * not just scroll.
 */
export function useCursorParallax({
  scope,
  attribute,
  amplitudes,
  yFactor = 0.6,
}: CursorParallaxOptions): void {
  const prefersReducedMotion = useReducedMotion()

  // Latest values, kept current by an effect declared before useGSAP so the setters
  // are rebuilt against fresh inputs rather than being mutated during render.
  const latest = useRef({ scope, amplitudes, yFactor })

  useIsomorphicLayoutEffect(() => {
    latest.current = { scope, amplitudes, yFactor }
  }, [scope, amplitudes, yFactor])

  useGSAP(
    () => {
      const host = latest.current.scope.current

      if (prefersReducedMotion || host === null) {
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

      const onPointerMove = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return

        // -1..1 from the centre of the scope.
        const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2
        const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2

        for (const setter of setters) {
          const amplitude = latest.current.amplitudes.current?.[setter.key] ?? 0
          setter.x(-nx * amplitude)
          setter.y(-ny * amplitude * latest.current.yFactor)
        }
      }

      host.addEventListener('pointermove', onPointerMove)

      return () => {
        host.removeEventListener('pointermove', onPointerMove)
      }
    },
    { dependencies: [prefersReducedMotion, attribute], revertOnUpdate: true },
  )
}
