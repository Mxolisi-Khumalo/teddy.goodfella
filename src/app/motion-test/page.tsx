'use client'

import { useRef, useState } from 'react'

import { ScrollScene, useReducedMotion, useScrollProgress } from '@/motion'

/**
 * TEMPORARY plumbing check for the motion layer. Delete once the hero carries it.
 *
 * The colours here are deliberately garish debug values, not design tokens. The
 * palette in PROJECT.md section 5 is still an unapproved proposal, so nothing on this
 * route may look like it — a plausible-looking stand-in is how an unapproved palette
 * ends up shipping.
 */

const DEBUG_MAGENTA = '#FF00A8'
const DEBUG_CYAN = '#00D1FF'
const DEBUG_LIME = '#C6FF00'

function Spacer({ label }: { label: string }) {
  return (
    <section className="flex h-screen items-center justify-center border-y border-neutral-800">
      <p className="font-mono text-sm text-neutral-500">{label}</p>
    </section>
  )
}

export default function MotionTestPage() {
  const prefersReducedMotion = useReducedMotion()

  const [pinProgress, setPinProgress] = useState(0)
  const [scrubProgress, setScrubProgress] = useState(0)

  const progressTargetRef = useRef<HTMLDivElement>(null)
  const hookProgress = useScrollProgress(progressTargetRef)

  return (
    <main className="bg-neutral-950 text-neutral-100">
      <div
        className="fixed top-0 right-0 z-50 border-b border-l border-neutral-700 bg-black/90 p-3 font-mono text-xs"
        data-testid="hud"
      >
        <div data-testid="hud-reduced-motion">
          prefers-reduced-motion:{' '}
          <strong>{prefersReducedMotion ? 'REDUCE' : 'no-preference'}</strong>
        </div>
        <div>lenis: {prefersReducedMotion ? 'disabled (native scroll)' : 'active'}</div>
        <div data-testid="hud-pin">scene 1 pin progress: {pinProgress.toFixed(2)}</div>
        <div data-testid="hud-scrub">
          scene 2 scrub progress: {scrubProgress.toFixed(2)}
        </div>
        <div data-testid="hud-hook">useScrollProgress: {hookProgress.toFixed(2)}</div>
      </div>

      <Spacer label="scroll down — motion plumbing test" />

      {/* 1. PIN: the scene is pinned while a scrubbed timeline plays out. */}
      <ScrollScene
        pin
        end="+=150%"
        onProgress={setPinProgress}
        className="flex h-screen items-center justify-center"
        build={(timeline, scene) => {
          const block = scene.querySelector('[data-block="pin"]')
          if (block === null) return
          // transform and opacity only — never layout properties in a scroll handler.
          timeline
            .fromTo(block, { xPercent: -120 }, { xPercent: 120, ease: 'none' })
            .fromTo(block, { rotate: 0 }, { rotate: 180, ease: 'none' }, 0)
        }}
      >
        <div
          data-block="pin"
          className="grid h-40 w-40 place-items-center font-mono text-sm font-bold text-black"
          style={{ backgroundColor: DEBUG_MAGENTA }}
        >
          PIN
        </div>
      </ScrollScene>

      <Spacer label="between scenes" />

      {/* 2. SCRUB: not pinned; the timeline is tied to scroll through the range. */}
      <ScrollScene
        scrub
        start="top bottom"
        end="bottom top"
        onProgress={setScrubProgress}
        className="flex h-screen items-center justify-center"
        build={(timeline, scene) => {
          const block = scene.querySelector('[data-block="scrub"]')
          if (block === null) return
          timeline.fromTo(
            block,
            { scale: 0.4, opacity: 0.25 },
            { scale: 1.6, opacity: 1, ease: 'none' },
          )
        }}
      >
        <div
          data-block="scrub"
          className="grid h-40 w-40 place-items-center font-mono text-sm font-bold text-black"
          style={{ backgroundColor: DEBUG_CYAN }}
        >
          SCRUB
        </div>
      </ScrollScene>

      <Spacer label="between scenes" />

      {/* 3. PROGRESS: useScrollProgress drives a readout, no timeline involved. */}
      <div
        ref={progressTargetRef}
        className="flex h-screen flex-col items-center justify-center gap-6"
      >
        <div
          data-block="progress"
          className="grid h-40 w-40 place-items-center font-mono text-sm font-bold text-black"
          style={{ backgroundColor: DEBUG_LIME }}
        >
          PROGRESS
        </div>
        <div className="h-3 w-64 border border-neutral-600" data-testid="progress-bar">
          <div
            className="h-full origin-left bg-neutral-100"
            style={{ transform: `scaleX(${hookProgress})` }}
          />
        </div>
        <p className="font-mono text-sm text-neutral-400">{hookProgress.toFixed(2)}</p>
      </div>

      <Spacer label="end of test — scroll back up" />
    </main>
  )
}
