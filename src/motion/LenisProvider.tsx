'use client'

import Lenis from 'lenis'
import { useEffect, type ReactNode } from 'react'

import 'lenis/dist/lenis.css'

import { useReducedMotion } from './ReducedMotionProvider'
import { gsap, ScrollTrigger } from './register'

/**
 * Smooth scroll, explicitly married to ScrollTrigger.
 *
 * The three lines below are not boilerplate — each one fixes a specific, observable
 * bug, and dropping any of them produces scroll-linked animation that looks almost
 * right and drifts:
 *
 *  1. `lenis.on('scroll', ScrollTrigger.update)` — Lenis moves the scroll position on
 *     its own schedule. Without this, ScrollTrigger keeps reading the browser's idea
 *     of scroll and every trigger fires against a position the user is no longer at.
 *
 *  2. Driving Lenis from `gsap.ticker` instead of its own requestAnimationFrame loop.
 *     Two independent rAF loops mean two clocks: the timeline advances on one frame
 *     and the scroll position on another, and scrubbed animation shears.
 *
 *  3. `gsap.ticker.lagSmoothing(0)` — lag smoothing clamps large frame deltas, so
 *     after a stall GSAP pretends less time passed than Lenis thinks did. The two
 *     desynchronise exactly when the mid-range Android in the perf budget stutters.
 *
 * When reduced motion is set, Lenis is never constructed and the browser's native
 * scroll is left completely alone.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      // Native scroll takes over entirely. Nothing to build, nothing to tear down.
      return
    }

    const lenis = new Lenis({
      autoRaf: false, // GSAP's ticker drives this instance; see (2) above.
    })

    lenis.on('scroll', ScrollTrigger.update)

    // gsap.ticker reports elapsed time in seconds; Lenis.raf expects milliseconds.
    const drive = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(drive)
    gsap.ticker.lagSmoothing(0)

    return () => {
      // Order matters: stop driving it before destroying it, or the final frame
      // calls raf() on a torn-down instance.
      gsap.ticker.remove(drive)
      lenis.off('scroll', ScrollTrigger.update)
      lenis.destroy()

      // Restore GSAP's documented defaults so a route without Lenis is not left
      // running with lag smoothing off.
      gsap.ticker.lagSmoothing(500, 33)
    }
  }, [prefersReducedMotion])

  return <>{children}</>
}
