'use client'

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

import { useReducedMotion } from './ReducedMotionProvider'
import { gsap, useGSAP } from './register'

/**
 * `useLayoutEffect` warns when it runs during SSR, so fall back the same way
 * @gsap/react does internally. Keeps this component's effect ordering consistent
 * with useGSAP's own.
 */
const useIsomorphicLayoutEffect =
  typeof document !== 'undefined' ? useLayoutEffect : useEffect

export interface ScrollSceneProps {
  readonly children: ReactNode
  /** Pin the scene while its scroll range plays out. */
  readonly pin?: boolean
  /** ScrollTrigger scrub: true to follow scroll exactly, a number to add easing lag. */
  readonly scrub?: boolean | number
  readonly start?: string
  readonly end?: string
  /**
   * Build the scene's timeline. Called inside `useGSAP`, scoped to the scene element,
   * so everything added here is reverted automatically.
   *
   * Consumers pass an inline arrow, which is a new identity every render. Rather than
   * make that rebuild the ScrollTrigger on each one, the latest value is kept in a ref
   * and read when the real dependencies change.
   */
  readonly build?: (timeline: gsap.core.Timeline, scene: HTMLDivElement) => void
  readonly onProgress?: (progress: number) => void
  readonly className?: string
  /**
   * What this scene looks like under reduced motion.
   *
   * `'timeline-end'` (the default) seeks the timeline to its last frame — the right
   * answer for a scene that reveals something, because the revealed state is the one
   * worth keeping.
   *
   * `'stylesheet'` builds nothing and lets CSS render the scene. Required by any
   * scene whose reduced-motion state is a PURPOSE-COMPOSED THIRD FRAME rather than
   * either end of the animation, because seeking writes inline transforms and
   * opacities, and an inline style beats a stylesheet rule — so the CSS frame would
   * be silently overridden. Measured: the hero's `@media (prefers-reduced-motion)`
   * block was entirely dead for this reason, including the rule keeping the name
   * visible.
   */
  readonly staticFrame?: 'timeline-end' | 'stylesheet'
}

/**
 * The boilerplate for a scroll-driven scene, in one place: pinning, scrub, range, and
 * the reduced-motion escape hatch.
 *
 * Centralising the escape hatch is the point. When reduced motion is set the timeline
 * is still built but is seeked straight to its end and left paused, with no
 * ScrollTrigger and no pin — so the scene renders as the static composition it would
 * have finished on, in normal document flow. A consumer never has to reimplement
 * that, and cannot forget to.
 *
 * A scene that composes its own reduced-motion frame in CSS must opt out of that with
 * `staticFrame="stylesheet"`, because seeking writes inline styles that beat the
 * stylesheet.
 */
export function ScrollScene({
  children,
  pin = false,
  scrub = true,
  start = 'top top',
  end = '+=100%',
  build,
  onProgress,
  className,
  staticFrame = 'timeline-end',
}: ScrollSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)

  // Initialised with the first value so useGSAP's first run already sees it, then
  // kept current by an effect declared ahead of useGSAP — so on a dependency change
  // this has already updated by the time the scene is rebuilt. Assigning during
  // render instead would be a React Compiler correctness violation.
  const buildRef = useRef(build)
  const onProgressRef = useRef(onProgress)

  useIsomorphicLayoutEffect(() => {
    buildRef.current = build
    onProgressRef.current = onProgress
  }, [build, onProgress])

  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const scene = sceneRef.current

      if (scene === null) {
        return
      }

      if (prefersReducedMotion) {
        // Building nothing is the point: no timeline means no inline styles, which
        // is the only way a stylesheet frame survives.
        if (staticFrame === 'stylesheet') {
          return
        }

        const timeline = gsap.timeline({ paused: true })
        buildRef.current?.(timeline, scene)
        timeline.progress(1).pause()
        onProgressRef.current?.(1)
        return
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: scene,
          start,
          end,
          pin,
          scrub,
          // Late-loading media changes layout; recalculate rather than trusting the
          // measurement taken at creation time.
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            onProgressRef.current?.(self.progress)
          },
        },
      })

      buildRef.current?.(timeline, scene)
    },
    {
      dependencies: [prefersReducedMotion, pin, scrub, start, end, staticFrame],
      revertOnUpdate: true,
      scope: sceneRef,
    },
  )

  return (
    <div ref={sceneRef} className={className}>
      {children}
    </div>
  )
}
