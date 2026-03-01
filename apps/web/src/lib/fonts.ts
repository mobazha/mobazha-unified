/**
 * Store Fonts — PG-201 / M4-2
 *
 * Inter is the default UI font. In Vite mode it is loaded at runtime via
 * a Google Fonts CSS link injected by loadStoreFont(). In Next.js mode
 * it *could* be preloaded via next/font/google, but for build-tool
 * portability we use the same runtime approach for all fonts.
 *
 * Other store fonts are loaded on demand when a store theme requires them.
 * This avoids downloading all 8 font families on initial page load.
 */

import type { FontFamily } from '@mobazha/core';

/**
 * Default font object.
 * Provides a stable API surface whether running under Next.js or Vite.
 */
export const defaultFont = {
  className: 'font-inter',
};

export const storeFontVariableClasses = '';

export const FONT_CSS_VAR_MAP: Record<FontFamily, string> = {
  inter: "'Inter', sans-serif",
  'dm-sans': "'DM Sans', sans-serif",
  'space-grotesk': "'Space Grotesk', sans-serif",
  playfair: "'Playfair Display', serif",
  lora: "'Lora', serif",
  merriweather: "'Merriweather', serif",
  'josefin-sans': "'Josefin Sans', sans-serif",
  poppins: "'Poppins', sans-serif",
};

const GOOGLE_FONTS_URL_MAP: Record<string, string> = {
  inter: 'Inter:wght@400;500;600;700',
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
  if (loadedFonts.has(family)) return;
  const spec = GOOGLE_FONTS_URL_MAP[family];
  if (!spec) return;

  loadedFonts.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Preload the default font (Inter). Called once from layout/app root.
 * Injects a preconnect hint + stylesheet link for Inter.
 */
export function preloadDefaultFont(): void {
  if (loadedFonts.has('inter')) return;

  // Preconnect hints for faster font loading
  if (!document.querySelector('link[href="https://fonts.googleapis.com"][rel="preconnect"]')) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect);

    const preconnectStatic = document.createElement('link');
    preconnectStatic.rel = 'preconnect';
    preconnectStatic.href = 'https://fonts.gstatic.com';
    preconnectStatic.crossOrigin = 'anonymous';
    document.head.appendChild(preconnectStatic);
  }

  loadStoreFont('inter');
}
