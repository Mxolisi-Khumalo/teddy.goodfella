import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this, Turbopack walks up and finds the unrelated
  // package-lock.json in D:\source, warns, and infers a root outside this repo.
  turbopack: {
    root: import.meta.dirname,
  },
}

export default nextConfig
