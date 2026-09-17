'use client'

import { useEffect } from 'react'

import { ScrollTrigger } from './register'

/**
 * Keeps ScrollTrigger's measurements honest as media arrives.
 *
 * ScrollTrigger measures the document once and caches the result. An image that
 * decodes after that measurement shifts everything below it, so every trigger past
 * that point is pinned to coordinates that no longer exist: pins release early,
 * scrubs finish before their section does, and the further down the page you are the
 * worse it gets. It looks like a tuning problem and is actually a stale layout.
 *
 * Refreshes are batched into one call per animation frame, so a gallery of twenty
 * images triggers one recalculation rather than twenty.
 */
export function ScrollRefresh() {
  useEffect(() => {
    let disposed = false
    let frame = 0

    const refresh = () => {
      if (disposed) {
        return
      }
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!disposed) {
          ScrollTrigger.refresh()
        }
      })
    }

    const settled = (event: Event) => {
      const image = event.currentTarget
      if (image instanceof HTMLImageElement) {
        image.removeEventListener('load', settled)
        image.removeEventListener('error', settled)
      }
      refresh()
    }

    const tracked = new Set<HTMLImageElement>()

    const track = (image: HTMLImageElement) => {
      // `complete` covers cached and already-decoded images: they never fire load.
      if (image.complete || tracked.has(image)) {
        return
      }
      tracked.add(image)
      image.addEventListener('load', settled)
      image.addEventListener('error', settled)
    }

    document.querySelectorAll('img').forEach(track)

    // Images mounted later — by a client component, a lazy boundary, or next/image
    // swapping in its real source — would otherwise never be tracked at all.
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) {
            track(node)
          } else if (node instanceof HTMLElement) {
            node.querySelectorAll('img').forEach(track)
          }
        })
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    window.addEventListener('load', refresh)

    // Web fonts change text metrics, which moves every trigger below the text just as
    // surely as an image does.
    void document.fonts.ready.then(refresh)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('load', refresh)
      tracked.forEach((image) => {
        image.removeEventListener('load', settled)
        image.removeEventListener('error', settled)
      })
      tracked.clear()
    }
  }, [])

  return null
}
