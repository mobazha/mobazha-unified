/**
 * Store Fonts — PG-201
 *
 * Inter is the default UI font and is bundled from the repository via next/font/local.
 * Other store fonts are loaded on demand when a store theme requires them,
 * using Google Fonts CSS links injected at runtime. This avoids downloading
 * all 8 font families on initial page load.
 */

import localFont from 'next/font/local';
import type { FontFamily } from '@mobazha/core';
import { isExternalResourcesDisabled } from '@mobazha/core/config/env';

const inter = localFont({
  src: '../../public/fonts/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
});

export const defaultFont = inter;

export const storeFontVariableClasses = inter.variable;

export const FONT_CSS_VAR_MAP: Record<FontFamily, string> = {
  inter: 'var(--font-inter)',
  'dm-sans': "'DM Sans', sans-serif",
  'space-grotesk': "'Space Grotesk', sans-serif",
  playfair: "'Playfair Display', serif",
  lora: "'Lora', serif",
  merriweather: "'Merriweather', serif",
  'josefin-sans': "'Josefin Sans', sans-serif",
  poppins: "'Poppins', sans-serif",
};

const GOOGLE_FONTS_URL_MAP: Record<string, string> = {
  'dm-sans': 'DM+Sans:wght@400;500;600;700',
  'space-grotesk': 'Space+Grotesk:wght@400;500;600;700',
  playfair: 'Playfair+Display:wght@400;500;600;700',
  lora: 'Lora:wght@400;500;600;700',
  merriweather: 'Merriweather:wght@300;400;700',
  'josefin-sans': 'Josefin+Sans:wght@400;500;600;700',
  poppins: 'Poppins:wght@300;400;500;600;700',
};

const loadedFonts = new Set<string>();

/**
 * Dynamically load a store font by injecting a Google Fonts stylesheet link.
 * Idempotent — repeated calls for the same font are no-ops.
 */
export function loadStoreFont(family: FontFamily): void {
  if (typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) return;
  if (isExternalResourcesDisabled()) return;
  if (family === 'inter' || loadedFonts.has(family)) return;
  const spec = GOOGLE_FONTS_URL_MAP[family];
  if (!spec) return;

  loadedFonts.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
}
