/**
 * JS-side copies of the dark-theme tokens in global.css.
 *
 * Tailwind classes are compiled at build time, so anything that needs a colour
 * as a runtime *value* — SVG icon strokes, native components — cannot read
 * them. The provider is pinned to dark mode, so one palette covers the app.
 * Keep these in sync with the @variant dark block.
 */
export const themeColors = {
  foreground: '#FAFAFA',
  mutedForeground: '#A1A1A1',
  primary: '#FFF5F5',
  primaryForeground: '#171717',
  destructive: '#FF6467',
  border: '#2E2E2E',
  card: '#171717',
  background: '#0A0A0A',
} as const;
