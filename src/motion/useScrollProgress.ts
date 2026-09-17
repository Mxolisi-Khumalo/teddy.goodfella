'use client'

import { useState, type RefObject } from 'react'

import { useReducedMotion } from './ReducedMotionProvider'
import { ScrollTrigger, useGSAP } from './register'

export interface ScrollProgressOptions {
  /** ScrollTrigger start, e.g. 'top bottom'. */
  readonly start?: string
  /** ScrollTrigger end, e.g. 'bottom top'. */
  readonly end?: string
  /**
   * Progress is quantised to this many steps before being written to React state.
   * A raw ScrollTrigger reports every frame; at 60fps that is 60 renders a second of
   * the whole subtree, which is out of the perf budget on its own.
   *
   * This hook is for readouts and coarse logic. Per-frame work belongs in a scrubbed
   * timeline, which never touches React state at all — see `ScrollScene`.
   */
  readonly steps?: number
  /**
   * Value reported when reduced motion is set. Defaults to 1, i.e. the end state, so
   * a consumer that maps progress onto a composition resolves to its final frame
   * rather than its first.
   */
  readonly reducedMotionValue?: number
}

/**
 * Normalised 0–1 scroll progress for an element over a defined range.
 *
 * The ScrollTrigger is created inside `useGSAP`, so gsap's context kills it on
 * unmount and on every dependency change. `revertOnUpdate` is not optional: without
 * it @gsap/react defers cleanup until unmount, and each dependency change leaves the
 * previous trigger alive and firing.
 */
export function useScrollProgress(
  target: RefObject<HTMLElement | null>,
  options: ScrollProgressOptions = {},
): number {
  const {
    start = 'top bottom',
    end = 'bottom top',
    steps = 100,
    reducedMotionValue = 1,
  } = options

  const prefersReducedMotion = useReducedMotion()
  const [progress, setProgress] = useState(0)

  useGSAP(
    () => {
      const element = target.current

      if (prefersReducedMotion || element === null) {
        return
      }

      ScrollTrigger.create({
        trigger: element,
        start,
        end,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const quantised = Math.round(self.progress * steps) / steps
          setProgress((previous) => (previous === quantised ? previous : quantised))
        },
      })
    },
    {
      dependencies: [prefersReducedMotion, start, end, steps],
      revertOnUpdate: true,
    },
  )

  return prefersReducedMotion ? reducedMotionValue : progress
}
