'use client'

import { useRef } from 'react'

import type { HeroLayers, MediaAsset } from '@/content'
import { ScrollScene, useInputParallax } from '@/motion'

import { HeroNotice, type HeroNoticeContent } from './HeroNotice'
import { HeroTilt } from './HeroTilt'

/**
 * The 2.5D stage-to-crowd scroll reveal (PROJECT.md section 4).
 *
 * The narrative is that the visitor starts as Teddy and ends as a member of his
 * audience, and two mechanisms carry that rather than scale alone:
 *
 *  1. CROP, NOT SCALE. At 0% the cut-out is pushed off the bottom and left edges. A
 *     figure fully contained in frame reads as *someone standing in front of you* at
 *     any size; a figure cropped by your own viewport edges reads as *your own body*.
 *     Scale alone cannot make that distinction, which is why the brief's own diagram
 *     under-delivers if taken literally.
 *
 *  2. ZERO CURSOR PARALLAX MEANS "THIS IS YOURS". Every plane offsets under the
 *     cursor except the one that currently belongs to the visitor — at 0% that is the
 *     cut-out, at 100% it is the notice. A body attached to you cannot slide relative
 *     to you, so the moment your body starts sliding is the moment it stops being
 *     yours. The handover is expressed in the input device, not just the picture.
 *     The amplitudes are tweened by the same scrubbed timeline as the visuals, so
 *     they cannot desynchronise from the state they describe.
 *
 * Blur: no CSS filter is animated anywhere. Each plane carries a sharp node and a
 * soft node and the timeline cross-fades opacity between them, which is the brief's
 * stated preference. The soft node is the same file in a deliberately small layout
 * box scaled back up, so GPU filtering does the blurring for zero extra bytes. When
 * real pre-blurred variants exist this swaps to their `src` and nothing else changes.
 *
 * Only the TOP node of each pair is animated; the bottom one is pinned opaque in CSS.
 * Cross-fading both complementarily looks correct but sums to 75% coverage at the
 * midpoint — 0.5 over 0.5 — so the plane's ground shows through and the image dims
 * visibly halfway through the scroll. Measured at ?heroProgress=0.5 before the fix.
 */

/**
 * Dev harness: `?heroProgress=0.5` disables the ScrollTrigger and drives the timeline
 * directly.
 *
 * `timeline.progress()` renders synchronously — it does not wait for the ticker — so
 * this works in a browser that is not painting, where a scrubbed timeline cannot
 * advance at all (Lenis rides gsap.ticker, and ScrollTrigger defers its updates to
 * rAF). It is also simply faster than scrolling when nudging a keyframe value.
 *
 * Deliberately not gated on NODE_ENV: the values worth checking are the ones a
 * production build produces. An absent or malformed param is a no-op.
 */
const PROGRESS_PARAM = 'heroProgress'

function forcedProgress(): number | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = new URLSearchParams(window.location.search).get(PROGRESS_PARAM)

  if (raw === null) {
    return null
  }

  const value = Number(raw)

  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null
}

const PLANE_ORDER = ['back', 'mid', 'fore'] as const

type PlaneName = (typeof PLANE_ORDER)[number]

/** Cursor offset in px at 0% and at 100%. Note the foreground inverts. */
const PARALLAX: Record<PlaneName, { readonly from: number; readonly to: number }> = {
  // Behind you at 0% so it moves most; nearly fixed at 100% because by then it is
  // the room you are standing in, and rooms do not slide.
  back: { from: 18, to: 4 },
  mid: { from: 10, to: 14 },
  // Zero at 0% — this is your body. It only starts to slide once it is not.
  fore: { from: 0, to: 26 },
}

/**
 * Max rendered width of each plane as a fraction of the viewport, expressed for
 * `sizes`. The planes are full-bleed but the timeline scales them, so the widest
 * they are ever painted is viewport x max scale — 1.28 for back, 1.06 for mid,
 * 1.15 for fore. Understating this makes the browser pick a variant it then has to
 * upscale.
 */
const SHARP_SIZES: Record<PlaneName, string> = {
  back: '128vw',
  mid: '106vw',
  fore: '115vw',
}

/**
 * The soft twin's layout box is 12.5% of its plane, so it legitimately needs a far
 * smaller variant. This is what makes the LCP paint cheap: at 0% the visible node on
 * the back plane is the soft twin, and at 16vw on a 1440 screen at DPR2 the browser
 * fetches the 768 rung (9.9 KiB AVIF) rather than the 2560 one (230.3 KiB).
 */
const SOFT_SIZES: Record<PlaneName, string> = {
  back: '16vw',
  mid: '14vw',
  fore: '15vw',
}

function Plane({
  name,
  asset,
  priority,
}: {
  name: PlaneName
  asset: MediaAsset
  priority: boolean
}) {
  // Blur placeholder only on the opaque ground plate. Behind an alpha cut-out a
  // blurred rectangle would show through every transparent pixel and stay there
  // after load — so "blur placeholders on everything" cannot apply literally to the
  // two alpha planes.
  const blurBackground =
    name === 'back' ? { backgroundImage: `url("${asset.blurDataUrl}")` } : undefined

  return (
    <div
      className="hero-plane"
      data-plane={name}
      // Puts the cursor into its media state: an aperture, nothing to click.
      data-cursor="media"
      style={blurBackground}
    >
      <picture>
        {asset.sources.map((source) => (
          <source
            key={source.type}
            type={source.type}
            srcSet={source.srcSet}
            sizes={SHARP_SIZES[name]}
          />
        ))}
        <img
          data-node="sharp"
          className="hero-plane__img"
          src={asset.url}
          alt={asset.alt}
          width={asset.width}
          height={asset.height}
          sizes={SHARP_SIZES[name]}
          // Always low, even on the LCP plane: the sharp plate is not visible until
          // roughly 44% of the scroll, so it must not compete with the soft twin
          // that is actually painted at 0%.
          fetchPriority="low"
          decoding="async"
          draggable={false}
        />
      </picture>

      {/*
        Soft twin. Same ladder, but a small layout box scaled up in CSS — blurred by
        the GPU's own filtering rather than by a filter the compositor has to run.
        Empty alt because it is the same picture as the node above it.
      */}
      <picture>
        {asset.sources.map((source) => (
          <source
            key={`soft-${source.type}`}
            type={source.type}
            srcSet={source.srcSet}
            sizes={SOFT_SIZES[name]}
          />
        ))}
        <img
          data-node="soft"
          className="hero-plane__img hero-plane__img--soft"
          src={asset.url}
          alt=""
          width={asset.width}
          height={asset.height}
          sizes={SOFT_SIZES[name]}
          // This is the LCP element on the back plane — the visible node at 0%, and
          // at 16vw it resolves to the 768 rung (9.9 KiB AVIF).
          fetchPriority={priority ? 'high' : 'low'}
          decoding="async"
          aria-hidden
          draggable={false}
        />
      </picture>
    </div>
  )
}

export function Hero({
  layers,
  name,
  personaTitle,
  notice,
}: {
  readonly layers: HeroLayers
  readonly name: string
  readonly personaTitle: string
  readonly notice: HeroNoticeContent
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const amplitude = useRef<Record<string, number>>({
    back: PARALLAX.back.from,
    mid: PARALLAX.mid.from,
    fore: PARALLAX.fore.from,
  })

  // Counter-parallax keyed off data-plane, amplitudes tweened by the timeline below.
  // Cursor on a desktop, device tilt on a phone — one consumer, and the component
  // does not know or care which input is driving it. All it needs back is the
  // permission status, because on iOS the sensor requires something to tap.
  const { orientation, requestOrientation } = useInputParallax({
    scope: stageRef,
    attribute: 'data-plane',
    amplitudes: amplitude,
  })

  return (
    <ScrollScene
      pin
      scrub={0.6}
      start="top top"
      end="+=220%"
      className="hero"
      build={(timeline, scene) => {
        const plane = (n: PlaneName) =>
          scene.querySelector<HTMLElement>(`[data-plane="${n}"]`)
        const node = (n: PlaneName, kind: 'sharp' | 'soft') =>
          scene.querySelector<HTMLElement>(`[data-plane="${n}"] [data-node="${kind}"]`)

        const back = plane('back')
        const mid = plane('mid')
        const fore = plane('fore')
        const type = scene.querySelector<HTMLElement>('[data-hero="type"]')
        const noticeEl = scene.querySelector<HTMLElement>('[data-hero="notice"]')

        if (back === null || mid === null || fore === null) return

        // --- the crowd arrives, slowly -------------------------------------------
        // power3.out decelerates into its final value, so the crowd settles rather
        // than crossfading linearly. This is the "slow settle" the brief asks for.
        timeline.fromTo(
          back,
          { scale: 1 },
          { scale: 1.28, ease: 'power3.out', duration: 1 },
          0,
        )
        timeline.fromTo(
          node('back', 'soft'),
          { opacity: 1 },
          { opacity: 0, ease: 'power2.inOut', duration: 1 },
          0,
        )

        // --- the stage recedes ----------------------------------------------------
        timeline.fromTo(
          mid,
          { scale: 1 },
          { scale: 1.06, ease: 'power2.out', duration: 1 },
          0,
        )
        timeline.fromTo(
          mid,
          { opacity: 0.85 },
          { opacity: 0.32, ease: 'power2.in', duration: 1 },
          0,
        )
        timeline.fromTo(
          node('mid', 'soft'),
          { opacity: 0 },
          { opacity: 1, ease: 'power2.inOut', duration: 1 },
          0,
        )

        // --- you stop being Teddy -------------------------------------------------
        // power2.in: he holds position early, then leaves decisively. An ease-out
        // here would make him drift away from the first pixel of scroll, which reads
        // as a zoom-out rather than a handover.
        //
        // The crop offset MUST live on xPercent/yPercent, not on x/y, and must be
        // stated explicitly here rather than inherited from CSS. Two reasons, both
        // found by measurement:
        //   - the parallax layer owns the x/y channel. At 0% this plane's amplitude is
        //     0, so the cursor writes x = 0 — which silently erased a crop expressed
        //     as x and left the figure centred, destroying the whole first-person
        //     read. xPercent is a separate transform component, so the two coexist.
        //   - GSAP decomposes an existing CSS transform into px on first touch, so
        //     relying on `translate(-18%, 14%)` from the stylesheet makes the start
        //     value depend on the viewport width at init. fromTo pins it.
        timeline.fromTo(
          fore,
          { xPercent: -18, yPercent: 14, scale: 1.15 },
          { xPercent: 0, yPercent: -4, scale: 0.2, ease: 'power2.in', duration: 1 },
          0,
        )
        timeline.fromTo(
          node('fore', 'soft'),
          { opacity: 0 },
          { opacity: 1, ease: 'power1.inOut', duration: 1 },
          0,
        )

        // --- type hands over to the notice ---------------------------------------
        if (type !== null) {
          timeline.to(
            type,
            { opacity: 0, yPercent: -6, ease: 'power1.in', duration: 0.45 },
            0,
          )
        }
        if (noticeEl !== null) {
          timeline.fromTo(
            noticeEl,
            { opacity: 0, yPercent: 4 },
            { opacity: 1, yPercent: 0, ease: 'power2.out', duration: 0.4 },
            0.55,
          )
        }

        // --- parallax authority transfers ----------------------------------------
        // Tweened on the same timeline as the visuals so the two cannot drift apart.
        for (const planeName of PLANE_ORDER) {
          timeline.to(
            amplitude.current,
            {
              [planeName]: PARALLAX[planeName].to,
              ease: 'power1.inOut',
              duration: 1,
            },
            0,
          )
        }

        // Must come last: every tween has to be on the timeline before its progress
        // is meaningful.
        const forced = forcedProgress()

        if (forced !== null) {
          timeline.scrollTrigger?.disable()
          timeline.progress(forced).pause()
        }
      }}
    >
      <div ref={stageRef} className="hero__stage" data-hero="stage">
        {PLANE_ORDER.map((planeName) => (
          <Plane
            key={planeName}
            name={planeName}
            asset={
              planeName === 'back'
                ? layers.back
                : planeName === 'mid'
                  ? layers.mid
                  : layers.foreground
            }
            // Marks the LCP plane. Inside Plane this raises only the soft twin,
            // which is the node actually painted at 0%.
            priority={planeName === 'back'}
          />
        ))}

        <div className="hero__type" data-hero="type">
          <p className="hero__name">{name}</p>
          <p className="hero__persona">{personaTitle}</p>
        </div>

        <div className="hero__notice" data-hero="notice">
          <HeroNotice content={notice} />
        </div>

        {/* Renders on iOS only, and only until the question has been answered. */}
        <HeroTilt status={orientation} onRequest={requestOrientation} />
      </div>
      </div>
    </ScrollScene>
  )
}
