import type { ReactNode } from 'react'

import { ThemeStyle } from '@/components/ThemeStyle'
import { getTheme } from '@/content'
import { MotionProvider } from '@/motion'

import './globals.css'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await getTheme()

  return (
    <html lang="en">
      <head>
        {/* Server-rendered so the palette is present on first paint. Reading theme in
            client JS would be a hydration mismatch and a flash of the wrong colour. */}
        <ThemeStyle theme={theme} />
      </head>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  )
}
