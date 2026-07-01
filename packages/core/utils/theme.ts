/**
 * Store Theme Utilities — PG-201
 *
 * Palette mapping, font-family mapping, border-radius mapping,
 * and WCAG AA contrast text color computation.
 */

import type { ThemePalette, FontFamily, BorderRadius, SpacingSize } from '../types/storeConfig';

// ---------------------------------------------------------------------------
// Palette → color set mapping
// ---------------------------------------------------------------------------

export interface PaletteColors {
  primary: string;
  secondary: string;
  accent: string;
}

export const PALETTE_MAP: Record<Exclude<ThemePalette, 'custom'>, PaletteColors> = {
  ocean: { primary: '#1a3a5c', secondary: '#4a9eda', accent: '#72c4ff' },
  forest: { primary: '#2d4a22', secondary: '#6b8f5e', accent: '#a3c585' },
  sunset: { primary: '#c0533a', secondary: '#e8845a', accent: '#f5b07c' },
  midnight: { primary: '#2b1e5e', secondary: '#5c4d9a', accent: '#8b7fd4' },
  minimal: { primary: '#000000', secondary: '#6b7280', accent: '#9ca3af' },
  earth: { primary: '#8b4513', secondary: '#c2956a', accent: '#deb887' },
  lavender: { primary: '#6b5b95', secondary: '#9b8dc7', accent: '#c3b7e0' },
  rose: { primary: '#b5495b', secondary: '#d4838f', accent: '#ebbdc4' },
};

export function getPaletteColors(palette: ThemePalette | string): PaletteColors | null {
  if (palette === 'custom') return null;
  return PALETTE_MAP[palette as Exclude<ThemePalette, 'custom'>] ?? null;
}

export const ALL_PALETTES = Object.keys(PALETTE_MAP) as Array<Exclude<ThemePalette, 'custom'>>;

// ---------------------------------------------------------------------------
// Font family mapping (CSS value)
// ---------------------------------------------------------------------------

export const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  inter: "'Inter', sans-serif",
  'dm-sans': "'DM Sans', sans-serif",
  'space-grotesk': "'Space Grotesk', sans-serif",
  playfair: "'Playfair Display', serif",
  lora: "'Lora', serif",
  merriweather: "'Merriweather', serif",
  'josefin-sans': "'Josefin Sans', sans-serif",
  poppins: "'Poppins', sans-serif",
};

// ---------------------------------------------------------------------------
// Border radius mapping (px string)
// ---------------------------------------------------------------------------

export const RADIUS_MAP: Record<BorderRadius, string> = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '16px',
  full: '9999px',
};

// ---------------------------------------------------------------------------
// Spacing mapping (rem string)
// ---------------------------------------------------------------------------

export const SPACING_MAP: Record<SpacingSize, string> = {
  none: '0',
  sm: '1rem',
  md: '2rem',
  lg: '3rem',
  xl: '4rem',
};

// ---------------------------------------------------------------------------
// Contrast text color (WCAG AA compliant)
// ---------------------------------------------------------------------------

function sRGBtoLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Returns #000000 or #ffffff depending on which provides
 * sufficient contrast against the given hex background.
 */
export function getContrastText(hex: string): string {
  const clean = hex.replace('#', '');
  const r = sRGBtoLinear(parseInt(clean.slice(0, 2), 16) / 255);
  const g = sRGBtoLinear(parseInt(clean.slice(2, 4), 16) / 255);
  const b = sRGBtoLinear(parseInt(clean.slice(4, 6), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Blends a hex colour toward white (amount 0–1).
 */
export function lightenHex(hex: string, amount: number): string {
  const c = normalizeHex(hex).replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

/**
 * Blends a hex colour toward black (amount 0–1).
 */
export function darkenHex(hex: string, amount: number): string {
  const c = normalizeHex(hex).replace('#', '');
  const r = Math.round(parseInt(c.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(c.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(c.slice(4, 6), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Validates a hex color string (#rrggbb or #rgb).
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

/**
 * Normalizes #rgb to #rrggbb.
 */
export function normalizeHex(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  return `#${clean}`;
}

// ---------------------------------------------------------------------------
// Deterministic fallback palette from store name (no StoreConfig yet)
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic palette index from a string (store name or peerID).
 * Used when no StoreConfig exists so every store still gets a consistent,
 * non-default look.
 */
export function getFallbackPalette(seed: string): Exclude<ThemePalette, 'custom'> {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const keys = ALL_PALETTES;
  return keys[Math.abs(hash) % keys.length];
}
