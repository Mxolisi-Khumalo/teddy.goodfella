'use client'

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Subscribing rather than reading once on mount is the whole point: a visitor can
 * flip the OS setting while the page is open, and every consumer downstream has to
 * re-render and tear its animations down when they do.
 */
function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(QUERY)
  query.addEventListener('change', onStoreChange)
  return () => {
    query.removeEventListener('change', onStoreChange)
  }
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/**
 * The server cannot know the visitor's preference, so it renders the motion-enabled
 * tree and the client corrects on hydration.
 *
 * Safe here because nothing animates on first paint — every animation in this project
 * is scroll-driven, so the correction lands before any of them could run. Anything
 * paint-critical must use the CSS `@media (prefers-reduced-motion: reduce)` query
 * instead, which the server does honour.
 */
function getServerSnapshot(): boolean {
  return false
}

const ReducedMotionContext = createContext<boolean>(false)

export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  return (
    <ReducedMotionContext.Provider value={prefersReducedMotion}>
      {children}
    </ReducedMotionContext.Provider>
  )
}

/** True when the visitor has asked for reduced motion. Reacts to live changes. */
export function useReducedMotion(): boolean {
  return useContext(ReducedMotionContext)
}
