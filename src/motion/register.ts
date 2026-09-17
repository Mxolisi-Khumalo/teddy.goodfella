'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Single registration point for GSAP plugins.
 *
 * Every module in `src/motion` imports gsap and ScrollTrigger from here rather than
 * from the packages directly, so registration is guaranteed to have happened before
 * first use and can never be double-registered from two entry points.
 *
 * Guarded on `window`: a `'use client'` module is still evaluated on the server
 * during SSR, and ScrollTrigger measures layout, so it must not register there.
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

export { gsap, ScrollTrigger, useGSAP }
