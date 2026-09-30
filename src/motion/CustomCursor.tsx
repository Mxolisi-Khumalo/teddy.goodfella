'use client'

import { useEffect, useRef, useState } from 'react'

import { gsap, useGSAP } from './register'

/**
 * The cursor's states. Each one says something: whether the thing under the pointer
 * can be acted on, or is media to be looked at. A morph that carried no distinction
 * would be decoration, which the guardrails say to cut.
 */
type CursorState = 'default' | 'interactive' | 'media'

/**
 * Elements that put the cursor into each state. Declarative rather than per-component
 * wiring, so a new link or plate gets the behaviour without remembering to add it.
 */
const INTERACTIVE = 'a[href], button, [role="button"], input, select, textarea, summary'
const MEDIA = '[data-cursor="media"], picture, video'

/**
 * Spring lag, in seconds.
 *
 * THIS NEEDS A HUMAN PASS. The brief asks for weighted rather than floaty or
 * sluggish, and that is a judgement no amount of measurement settles — I cannot feel
 * it. 0.42 with power3.out is a defensible starting point: fast enough that the
 * cursor arrives before the eye asks where it went, slow enough that a flick of the
 * wrist visibly drags it. Expect to move it.
 *
 * Below roughly 0.2 the lag stops reading as weight and starts reading as a dropped
 * frame. Above roughly 0.7 it reads as broken.
 */
const LAG_SECONDS = 0.42

/** The trailing ring lags further than the dot. The gap between them IS the weight. */
const RING_LAG_SECONDS = 0.6

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<CursorState>('default')
  const [visible, setVisible] = useState(false)

  useGSAP(() => {
    const dot = dotRef.current
    const ring = ringRef.current

    if (dot === null || ring === null) {
      return
    }

    // quickTo reuses one tween per property rather than allocating per event, and
    // applies on GSAP's ticker — so the listener below only assigns two numbers and
    // the work lands once per frame.
    const dotX = gsap.quickTo(dot, 'x', { duration: LAG_SECONDS, ease: 'power3.out' })
    const dotY = gsap.quickTo(dot, 'y', { duration: LAG_SECONDS, ease: 'power3.out' })
    const ringX = gsap.quickTo(ring, 'x', {
      duration: RING_LAG_SECONDS,
      ease: 'power3.out',
    })
    const ringY = gsap.quickTo(ring, 'y', {
      duration: RING_LAG_SECONDS,
      ease: 'power3.out',
    })

    let queued = false
    let px = 0
    let py = 0

    const apply = () => {
      queued = false
      dotX(px)
      dotY(py)
      ringX(px)
      ringY(py)
    }

    const onPointerMove = (event: PointerEvent) => {
      px = event.clientX
      py = event.clientY

      if (!visible) {
        setVisible(true)
      }

      if (!queued) {
        queued = true
        requestAnimationFrame(apply)
      }
    }

    // State is derived from what is under the pointer, once per enter/leave rather
    // than per move: `closest` walks the tree, so doing it on every frame would be
    // the one expensive thing in this file.
    const onPointerOver = (event: Event) => {
      const el = event.target

      if (!(el instanceof Element)) return

      if (el.closest(INTERACTIVE) !== null) {
        setState('interactive')
      } else if (el.closest(MEDIA) !== null) {
        setState('media')
      } else {
        setState('default')
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerover', onPointerOver, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerover', onPointerOver)
    }
  }, {})

  /**
   * Hide the native cursor only while ours is actually on screen, and restore it on
   * unmount, on tab blur and when the pointer leaves the document.
   *
   * A class on <html> rather than a global stylesheet rule: if this component ever
   * fails to mount, or the chunk fails to load, the native cursor is still there.
   * Hiding it from CSS would mean a broken import leaves the visitor with no cursor
   * at all.
   */
  useEffect(() => {
    const root = document.documentElement

    if (visible) {
      root.classList.add('has-custom-cursor')
    } else {
      root.classList.remove('has-custom-cursor')
    }

    const restore = () => {
      setVisible(false)
      root.classList.remove('has-custom-cursor')
    }

    window.addEventListener('blur', restore)
    document.addEventListener('mouseleave', restore)

    return () => {
      window.removeEventListener('blur', restore)
      document.removeEventListener('mouseleave', restore)
      root.classList.remove('has-custom-cursor')
    }
  }, [visible])

  return (
    <div className="cursor" aria-hidden data-visible={visible} data-state={state}>
      <div ref={ringRef} className="cursor__ring" data-testid="cursor-ring" />
      <div ref={dotRef} className="cursor__dot" data-testid="cursor-dot" />
    </div>
  )
}
