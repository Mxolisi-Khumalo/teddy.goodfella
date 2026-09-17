'use client'

import type { ReactNode } from 'react'

import { LenisProvider } from './LenisProvider'
import { ReducedMotionProvider } from './ReducedMotionProvider'
import { ScrollRefresh } from './ScrollRefresh'

/**
 * The one component a layout mounts.
 *
 * Order is load-bearing: LenisProvider reads the reduced-motion context to decide
 * whether to exist at all, so it has to sit inside ReducedMotionProvider.
 *
 * `children` is a prop crossing the server/client boundary, so wrapping the tree here
 * does not turn the pages inside it into client components.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <ReducedMotionProvider>
      <LenisProvider>
        <ScrollRefresh />
        {children}
      </LenisProvider>
    </ReducedMotionProvider>
  )
}
