import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this, Turbopack walks up and finds the unrelated
  // package-lock.json in D:\source, warns, and infers a root outside this repo.
  turbopack: {
    root: import.meta.dirname,
  },

  images: {
    // Hard rule 3: media is served from R2, never from the app host.
    //
    // The Vercel image optimiser would fetch each image from R2 once and then serve
    // every visitor-facing byte itself — making Vercel the CDN and R2 a back-end
    // origin, which is the inversion PROJECT.md §7 exists to prevent (100GB Hobby cap
    // divided by ~700kb of hero imagery is roughly 33k visits, on a site whose whole
    // point is being shared).
    //
    // Set globally so the rule is mechanical rather than something every <Image> has
    // to remember. next/image is still used for what it is genuinely good for here:
    // enforced width/height, blur placeholders and lazy loading — i.e. the CLS budget.
    //
    // Trade-off: `unoptimized` also means next/image emits no srcset of its own.
    // Responsive variants are therefore pre-generated into R2 and selected by a custom
    // loader — see NOTES.md / the image pipeline task, not yet built.
    unoptimized: true,
  },
}

export default nextConfig
