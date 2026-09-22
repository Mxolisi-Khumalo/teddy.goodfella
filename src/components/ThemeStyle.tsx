import type { ResolvedTheme } from '@/content'

/**
 * Emits the palette as CSS custom properties into a `<style>` tag, server-side.
 *
 * This is the mechanism CLAUDE.md's theming rule requires: the palette lives in the
 * theme content object, is rendered on the server, and is consumed through Tailwind's
 * `@theme`. Client JS never reads the theme on first paint — that would be a
 * hydration mismatch and a flash of the wrong colour, and in Phase 5 the values
 * arrive per tenant from the request, so they cannot be build-time constants.
 *
 * `accentOverride` is the single slot a client may change; it shadows `carnival`
 * rather than introducing a sixth name, so nothing downstream has to know whether an
 * override is in play.
 */
export function ThemeStyle({ theme }: { readonly theme: ResolvedTheme }) {
  const { palette, accentOverride } = theme

  const declarations = [
    `--ink:${palette.ink}`,
    `--paper:${palette.paper}`,
    `--seal:${palette.seal}`,
    `--carnival:${accentOverride ?? palette.carnival}`,
    `--muted:${palette.muted}`,
  ].join(';')

  return <style>{`:root{${declarations}}`}</style>
}
