'use client'

import { useRef, type RefObject } from 'react'

import { useReducedMotion } from './ReducedMotionProvider'
import { usePointerCapability } from './usePointerCapability'
import { useGSAP } from './register'

export interface Vector2 {
  x: number
  y: number
}

/**
 * A normalised 2D input, -1..1 on each axis, read live from a ref.
 *
 * THIS IS THE SEAM. Pointer position and device orientation are the same signal as
 * far as every consumer is concerned: a pair of numbers describing how far the
 * visitor has leaned, and in which direction. Factoring it out now means P7's
 * orientation input is a second *producer* against this type rather than a second
 * copy of every consumer.
 *
 * A ref rather than state, deliberately: this updates on every pointer frame, and a
 * React re-render per frame would cost more than everything it drives.
 */
export type VectorSource = RefObject<Vector2>

export interface PointerVectorOptions {
  /**
   * Element the vector is normalised against. Omit for the viewport.
   *
   * With a scope, -1..1 spans that element's box, so the effect is anchored to the
   * thing it belongs to rather than to where the window happens to be.
   */
  readonly scope?: RefObject<HTMLElement | null>
}

export interface PointerVector {
  /** Normalised -1..1 from the centre of the scope. Feeds parallax and magnetism. */
  readonly vector: VectorSource
  /** Raw viewport coordinates in px. Feeds anything that must sit under the pointer. */
  readonly client: VectorSource
  /** False on touch, or under reduced motion. Both refs stay at zero when false. */
  readonly active: boolean
}

/**
 * Pointer position as a normalised vector, rAF-throttled.
 *
 * The listener does nothing but assign two numbers — no measurement, no layout read,
 * no state update. Everything downstream applies its own values on GSAP's ticker,
 * which IS the rAF throttle. So a 1000Hz mouse costs 1000 assignments and still only
 * 60 applications per second.
 *
 * `getBoundingClientRect` is read once per resize rather than per move, because
 * reading it in the handler would force layout on every pointer frame — the exact
 * cost the throttle exists to avoid.
 */
export function usePointerVector({ scope }: PointerVectorOptions = {}): PointerVector {
  const vector = useRef<Vector2>({ x: 0, y: 0 })
  const client = useRef<Vector2>({ x: 0, y: 0 })

  const hasPointer = usePointerCapability()
  const prefersReducedMotion = useReducedMotion()
  const active = hasPointer && !prefersReducedMotion

  useGSAP(
    () => {
      if (!active) {
        // Leave both at rest so a consumer that forgets to check `active` still
        // renders the neutral composition rather than a stale offset.
        vector.current = { x: 0, y: 0 }
        client.current = { x: 0, y: 0 }
        return
      }

      const host = scope?.current ?? null

      // Cached box. Re-read on resize and scroll, never in the move handler.
      let box = (host ?? document.documentElement).getBoundingClientRect()
      const measure = () => {
        box = (host ?? document.documentElement).getBoundingClientRect()
      }

      const onPointerMove = (event: PointerEvent) => {
        client.current.x = event.clientX
        client.current.y = event.clientY

        if (box.width === 0 || box.height === 0) return

        vector.current.x = ((event.clientX - box.left) / box.width - 0.5) * 2
        vector.current.y = ((event.clientY - box.top) / box.height - 0.5) * 2
      }

      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('resize', measure, { passive: true })
      // A scoped box moves with the page, so its normalisation depends on scroll.
      if (host !== null) {
        window.addEventListener('scroll', measure, { passive: true })
      }

      return () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('resize', measure)
        if (host !== null) {
          window.removeEventListener('scroll', measure)
        }
      }
    },
    { dependencies: [active, scope], revertOnUpdate: true },
  )

  return { vector, client, active }
}
