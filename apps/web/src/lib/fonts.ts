/**
 * Pre-loaded Google Fonts — PG-201
 *
 * All store-supported fonts are loaded via next/font/google at build time.
 * Each font exposes a CSS variable (--font-*) that StoreThemeProvider
 * selects at runtime based on the seller's StoreConfig.theme.fontFamily.
 *
 * This eliminates FOUT and external Google Fonts requests at runtime.
 */

import {
  Inter,
  DM_Sans,
  Space_Grotesk,
  Playfair_Display,
  Lora,
  Merriweather,
  Josefin_Sans,
  Poppins,
} from 'next/font/google';
import type { FontFamily } from '@mobazha/core';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-merriweather',
  display: 'swap',
});

const josefinSans = Josefin_Sans({
  subsets: ['latin'],
  variable: '--font-josefin-sans',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const storeFonts = [
  inter,
  dmSans,
  spaceGrotesk,
  playfair,
  lora,
  merriweather,
  josefinSans,
  poppins,
] as const;

export const storeFontVariableClasses = storeFonts.map(f => f.variable).join(' ');

export const FONT_CSS_VAR_MAP: Record<FontFamily, string> = {
  inter: 'var(--font-inter)',
  'dm-sans': 'var(--font-dm-sans)',
  'space-grotesk': 'var(--font-space-grotesk)',
  playfair: 'var(--font-playfair)',
  lora: 'var(--font-lora)',
  merriweather: 'var(--font-merriweather)',
  'josefin-sans': 'var(--font-josefin-sans)',
  poppins: 'var(--font-poppins)',
};
