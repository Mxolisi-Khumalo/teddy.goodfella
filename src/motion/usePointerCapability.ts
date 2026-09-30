'use client'

import { useSyncExternalStore } from 'react'

/**
 * `(pointer: fine)` AND `(hover: hover)` — a real mouse or trackpad.
 *
 * Both halves matter. `pointer: fine` alone is true for a stylus, which has no hover
 * state and no business driving a custom cursor. Together they describe the only
 * input for which any of this is appropriate.
 */
const FINE = '(pointer: fine) and (hover: hover)'

/**
 * `(pointer: coarse)` — a finger.
 *
 * Deliberately NOT `not (pointer: fine)`. The two are not complements: a device can
 * report both (a touchscreen laptop), and the negation would also capture `pointer:
 * none` — a TV remote or a keyboard-only session, where tilting nothing is the
 * correct behaviour.
 */
const COARSE = '(pointer: coarse)'

function subscribeTo(query: string): (onStoreChange: () => void) => () => void {
  return (onStoreChange) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onStoreChange)
    return () => {
      mql.removeEventListener('change', onStoreChange)
    }
  }
}

function snapshotOf(query: string): () => boolean {
  return () => window.matchMedia(query).matches
}

// Module scope so each hook passes useSyncExternalStore a stable identity. Declaring
// these inside the hooks would resubscribe on every render.
const subscribeFine = subscribeTo(FINE)
const subscribeCoarse = subscribeTo(COARSE)
const snapshotFine = snapshotOf(FINE)
const snapshotCoarse = snapshotOf(COARSE)

/**
 * The server assumes NEITHER capability.
 *
 * For the fine-pointer hook this is the load-bearing half of "must never load or run
 * on touch devices": the cursor layer is absent from the server-rendered markup, so a
 * touch device receives a document with no cursor in it and — because `CursorLayer`
 * imports the implementation from inside an effect — never fetches the chunk either.
 *
 * For the coarse hook the same pessimism means a desktop never renders the tilt
 * affordance and never attaches an orientation listener. Both hooks guessing "no"
 * makes the two input languages mutually exclusive on the server as well as at
 * runtime, which matters because they write the same transform channel.
 */
function noCapability(): boolean {
  return false
}

/**
 * True only on devices with a real pointer. Reacts live — a tablet gaining a mouse,
 * or a laptop switching to touch input, flips this and every consumer tears down.
 */
export function usePointerCapability(): boolean {
  return useSyncExternalStore(subscribeFine, snapshotFine, noCapability)
}

/**
 * True on a touch device. The gate for the mobile motion language.
 *
 * A touchscreen laptop matches this AND `usePointerCapability`, which would let the
 * cursor and the orientation producer both write `x`/`y` to the hero planes through
 * separate `quickTo` instances — two tweens fighting over one transform component.
 * Consumers must therefore treat fine pointer as the winner and only use this when
 * `usePointerCapability()` is false. `useOrientationVector` does that internally so
 * no caller has to remember it.
 */
export function useCoarsePointerCapability(): boolean {
  return useSyncExternalStore(subscribeCoarse, snapshotCoarse, noCapability)
}
