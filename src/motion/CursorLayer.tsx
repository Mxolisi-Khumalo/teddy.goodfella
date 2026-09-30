'use client'

import { useEffect, useState, type ComponentType } from 'react'

import { useReducedMotion } from './ReducedMotionProvider'
import { usePointerCapability } from './usePointerCapability'

/**
 * Loads the cursor implementation ONLY on a device that can use it.
 *
 * WHY NOT `next/dynamic`
 * The obvious version — `dynamic(() => import('./CustomCursor'), { ssr: false })` —
 * does split the component into its own chunk, but Next still lists that chunk in the
 * route's chunk group, so the browser fetches it during initial load regardless of
 * whether the component ever renders. Measured: a touch viewport requested the 1.9 kB
 * cursor chunk three times without ever mounting a cursor. Splitting a chunk and
 * not fetching it are different things.
 *
 * So the import is performed inside an effect that cannot run until the capability
 * check has already passed. Nothing references the module at module scope, which is
 * what keeps it out of the initial graph; the request happens on a real pointer
 * device, one tick after hydration, and never at all on a phone.
 *
 * That matters beyond tidiness: PROJECT.md §1 puts fans on prepaid mobile data, and
 * shipping them a desktop-only cursor is spending their money on something they
 * cannot see.
 */
export function CursorLayer() {
  const hasPointer = usePointerCapability()
  const prefersReducedMotion = useReducedMotion()

  // Hard rule 6 names cursor interactions explicitly, not just scroll.
  const active = hasPointer && !prefersReducedMotion

  const [Cursor, setCursor] = useState<ComponentType | null>(null)

  useEffect(() => {
    if (!active) {
      // Deliberately does NOT clear the cached module. The render guard below already
      // returns null while inactive, so clearing would only force a refetch if a
      // pointer reappeared — and a synchronous setState here is a cascading render.
      return
    }

    let cancelled = false

    void import('./CustomCursor').then((module) => {
      if (!cancelled) {
        // Wrapped in a callback: setState treats a bare function as an updater.
        setCursor(() => module.CustomCursor)
      }
    })

    return () => {
      cancelled = true
    }
  }, [active])

  if (!active || Cursor === null) {
    return null
  }

  return <Cursor />
}
