'use client'

import { useEffect, type RefObject } from 'react'

import { useReducedMotion } from './ReducedMotionProvider'
import { gsap, useGSAP } from './register'
import { usePointerCapability } from './usePointerCapability'

export interface MagneticOptions {
  /** The element that leans toward the pointer. */
  readonly target: RefObject<HTMLElement | null>
  /**
   * Radius in px, measured from the element's edge, within which attraction applies.
   * Beyond it the element is at rest.
   */
  readonly radius?: number
  /**
   * Maximum displacement in px at full attraction.
   *
   * Kept deliberately small. The brief: "if it's noticeable as an effect rather than
   * felt as a quality, it's too much." 6px is about the point where a pointer
   * approaching a link feels like the link acknowledged it, without the element
   * appearing to move on its own.
   */
  readonly strength?: number
}

/**
 * Magnetic attraction on a single element.
 *
 * The element leans toward the pointer as it approaches, and returns to rest when the
 * pointer leaves the radius. Attraction falls off with distance on an eased curve
 * rather than linearly, so there is no perceptible edge where the effect switches on
 * — a linear falloff makes the radius itself visible, which is what turns this from a
 * quality into an effect.
 *
 * Writes `x`/`y` only, per the transform-channel rule. Nothing else animates those
 * channels on a CTA, so there is no conflict; if that changes, this is the owner.
 *
 * Off on touch and under reduced motion. A magnetic control that cannot be hovered is
 * either invisible or, worse, a target that dodges a tap.
 */
export function useMagnetic({
  target,
  radius = 120,
  strength = 6,
}: MagneticOptions): void {
  const hasPointer = usePointerCapability()
  const prefersReducedMotion = useReducedMotion()
  const active = hasPointer && !prefersReducedMotion

  useGSAP(
    () => {
      const el = target.current

      if (!active || el === null) {
        return
      }

      const toX = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' })
      const toY = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' })

      // Box cached and refreshed off the move path — reading it per pointer frame
      // would force layout exactly where the throttle is meant to prevent it.
      let box = el.getBoundingClientRect()
      const measure = () => {
        box = el.getBoundingClientRect()
      }

      let queued = false
      let px = 0
      let py = 0

      const apply = () => {
        queued = false

        const cx = box.left + box.width / 2
        const cy = box.top + box.height / 2

        // Distance from the element's EDGE, not its centre, so a wide button and a
        // small one both acquire the pointer at the same apparent proximity.
        const dx = Math.max(Math.abs(px - cx) - box.width / 2, 0)
        const dy = Math.max(Math.abs(py - cy) - box.height / 2, 0)
        const distance = Math.hypot(dx, dy)

        if (distance > radius) {
          toX(0)
          toY(0)
          return
        }

        // Eased falloff: 1 at the edge, 0 at the radius, with no hard boundary.
        const pull = (1 - distance / radius) ** 2

        toX(((px - cx) / (box.width / 2 + radius)) * strength * pull)
        toY(((py - cy) / (box.height / 2 + radius)) * strength * pull)
      }

      const onPointerMove = (event: PointerEvent) => {
        px = event.clientX
        py = event.clientY

        // rAF throttle: many events, one application per frame.
        if (!queued) {
          queued = true
          requestAnimationFrame(apply)
        }
      }

      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('resize', measure, { passive: true })
      window.addEventListener('scroll', measure, { passive: true })

      return () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('resize', measure)
        window.removeEventListener('scroll', measure)
      }
    },
    { dependencies: [active, radius, strength, target], revertOnUpdate: true },
  )

  // Returning to rest on blur matters: the pointer can leave the window mid-lean and
  // never fire another move event, stranding the element off-centre.
  useEffect(() => {
    if (!active) return

    const el = target.current
    if (el === null) return

    const rest = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
    }

    window.addEventListener('blur', rest)
    document.addEventListener('mouseleave', rest)

    return () => {
      window.removeEventListener('blur', rest)
      document.removeEventListener('mouseleave', rest)
    }
  }, [active, target])
}
