'use client'

import { useEffect, useRef, useState } from 'react'

import { r2Url } from '@/lib/r2'

/**
 * TEMPORARY measurement rig. Delete once the blur strategy is settled.
 *
 * PROJECT.md's hero brief says "Blur is expensive. Prefer pre-blurred image variants
 * over animating a CSS filter, or cross-fade between variants. Measure before
 * choosing." This measures, on the real 2560x1440 R2 asset, so the choice is made on
 * numbers rather than received wisdom.
 *
 * Each technique animates for a fixed number of frames while frame times are sampled
 * from rAF. Styles are written directly rather than through GSAP so the cost being
 * measured is the property, not the tween engine.
 *
 * CAVEAT, stated up front: this runs on a desktop with no CPU throttling, so the
 * absolute fps here says nothing about the 30fps mid-Android floor. What it gives is
 * the RELATIVE cost ordering of the techniques, which is what picks a winner.
 */

const SOURCE = 'hero-back-crowd.placeholder.webp'
const FRAMES_PER_RUN = 180
const WARMUP_FRAMES = 20

interface Sample {
  readonly technique: string
  readonly what: string
  readonly meanFps: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly worstMs: number
  readonly over16ms: number
  readonly over33ms: number
}

type Apply = (t: number, nodes: Record<string, HTMLElement>) => void

interface Technique {
  readonly id: string
  readonly what: string
  readonly apply: Apply
  readonly reset: (nodes: Record<string, HTMLElement>) => void
}

/** Techniques share one DOM so no run pays another's layout cost. */
const TECHNIQUES: readonly Technique[] = [
  {
    id: 'baseline-transform',
    what: 'transform: scale() only — the floor every other option is measured against',
    apply: (t, n) => {
      n.sharp.style.transform = `scale(${(1 + t * 0.25).toFixed(4)})`
    },
    reset: (n) => {
      n.sharp.style.transform = 'scale(1)'
    },
  },
  {
    id: 'filter-blur',
    what: 'filter: blur(0 -> 24px) animated on a full-bleed 2560x1440 layer',
    apply: (t, n) => {
      n.sharp.style.filter = `blur(${(t * 24).toFixed(2)}px)`
    },
    reset: (n) => {
      n.sharp.style.filter = 'none'
    },
  },
  {
    id: 'filter-saturate',
    what: 'filter: saturate(1 -> 0.6) animated — the desaturation the brief also asks for',
    apply: (t, n) => {
      n.sharp.style.filter = `saturate(${(1 - t * 0.4).toFixed(3)})`
    },
    reset: (n) => {
      n.sharp.style.filter = 'none'
    },
  },
  {
    id: 'opacity-crossfade',
    what: 'opacity cross-fade between two stacked full-bleed layers (proxy for pre-blurred variant swap)',
    apply: (t, n) => {
      n.second.style.opacity = t.toFixed(4)
    },
    reset: (n) => {
      n.second.style.opacity = '0'
    },
  },
  {
    id: 'upscaled-copy-crossfade',
    what: 'cross-fade to a low-res copy scaled up by transform — blur from GPU filtering, zero extra bytes',
    apply: (t, n) => {
      n.upscaled.style.opacity = t.toFixed(4)
    },
    reset: (n) => {
      n.upscaled.style.opacity = '0'
    },
  },
  {
    id: 'blur-plus-scale',
    what: 'filter: blur() AND transform: scale() together — what the foreground layer actually needs',
    apply: (t, n) => {
      n.sharp.style.filter = `blur(${(t * 24).toFixed(2)}px) saturate(${(1 - t * 0.4).toFixed(3)})`
      n.sharp.style.transform = `scale(${(1 - t * 0.35).toFixed(4)})`
    },
    reset: (n) => {
      n.sharp.style.filter = 'none'
      n.sharp.style.transform = 'scale(1)'
    },
  },
]

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[index] ?? 0
}

export default function BlurBenchPage() {
  const [status, setStatus] = useState('loading image…')
  const [samples, setSamples] = useState<readonly Sample[]>([])

  const sharpRef = useRef<HTMLImageElement>(null)
  const secondRef = useRef<HTMLImageElement>(null)
  const upscaledRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const sharp = sharpRef.current
    const second = secondRef.current
    const upscaled = upscaledRef.current
    if (sharp === null || second === null || upscaled === null) return

    const nodes: Record<string, HTMLElement> = { sharp, second, upscaled }
    let cancelled = false

    const runOne = (technique: Technique) =>
      new Promise<Sample>((resolve) => {
        const times: number[] = []
        let frame = 0
        let last = performance.now()

        const step = (now: number) => {
          if (cancelled) return
          const delta = now - last
          last = now

          if (frame > WARMUP_FRAMES) times.push(delta)

          technique.apply(Math.min(1, frame / FRAMES_PER_RUN), nodes)
          frame += 1

          if (frame <= FRAMES_PER_RUN) {
            requestAnimationFrame(step)
            return
          }

          technique.reset(nodes)
          const sorted = [...times].sort((a, b) => a - b)
          const mean = times.reduce((s, x) => s + x, 0) / (times.length || 1)
          resolve({
            technique: technique.id,
            what: technique.what,
            meanFps: Math.round((1000 / mean) * 10) / 10,
            p50Ms: Math.round(percentile(sorted, 50) * 100) / 100,
            p95Ms: Math.round(percentile(sorted, 95) * 100) / 100,
            worstMs: Math.round((sorted[sorted.length - 1] ?? 0) * 100) / 100,
            over16ms: times.filter((t) => t > 16.7).length,
            over33ms: times.filter((t) => t > 33.3).length,
          })
        }

        requestAnimationFrame(step)
      })

    const run = async () => {
      // Decode before measuring, or the first technique pays the decode cost.
      await Promise.all(
        [sharp, second, upscaled].map((img) =>
          (img as HTMLImageElement).decode().catch(() => undefined),
        ),
      )
      if (cancelled) return

      const collected: Sample[] = []
      for (const technique of TECHNIQUES) {
        if (cancelled) return
        setStatus(`measuring ${technique.id}…`)
        collected.push(await runOne(technique))
        setSamples([...collected])
      }

      setStatus('done')
      // Read from the console / javascript_tool rather than scraping the DOM.
      ;(window as unknown as { __blurBench?: readonly Sample[] }).__blurBench = collected
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  const src = r2Url(SOURCE)

  return (
    <main className="min-h-screen bg-neutral-950 p-6 font-mono text-neutral-100">
      <div className="relative mb-6 h-[320px] w-full overflow-hidden border border-neutral-700">
        {/* All three stacked; only transform/opacity/filter are touched during a run. */}
        <img
          ref={sharpRef}
          src={src}
          alt=""
          width={2560}
          height={1440}
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
        />
        <img
          ref={secondRef}
          src={src}
          alt=""
          width={2560}
          height={1440}
          className="absolute inset-0 h-full w-full object-cover opacity-0 will-change-[opacity]"
        />
        {/* Rendered at 1/8 and scaled back up: bilinear filtering does the blurring. */}
        <img
          ref={upscaledRef}
          src={src}
          alt=""
          width={2560}
          height={1440}
          className="absolute inset-0 h-full w-full origin-center object-cover opacity-0 will-change-[opacity]"
          style={{
            transform: 'scale(1.02)',
            imageRendering: 'auto',
            filter: 'blur(0px)',
          }}
        />
      </div>

      <p className="mb-4 text-sm text-neutral-400">status: {status}</p>

      <table className="w-full text-left text-xs">
        <thead className="text-neutral-500">
          <tr>
            <th className="py-2 pr-4">technique</th>
            <th className="py-2 pr-4">mean fps</th>
            <th className="py-2 pr-4">p50 ms</th>
            <th className="py-2 pr-4">p95 ms</th>
            <th className="py-2 pr-4">worst ms</th>
            <th className="py-2 pr-4">&gt;16.7ms</th>
            <th className="py-2 pr-4">&gt;33.3ms</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <tr key={s.technique} className="border-t border-neutral-800">
              <td className="py-2 pr-4">{s.technique}</td>
              <td className="py-2 pr-4">{s.meanFps}</td>
              <td className="py-2 pr-4">{s.p50Ms}</td>
              <td className="py-2 pr-4">{s.p95Ms}</td>
              <td className="py-2 pr-4">{s.worstMs}</td>
              <td className="py-2 pr-4">{s.over16ms}</td>
              <td className="py-2 pr-4">{s.over33ms}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
