'use client';

/**
 * StoreThemeProvider — PG-201
 *
 * Injects --store-* CSS custom properties based on the seller's
 * StoreConfig.theme. Children (Section components) read these vars
 * instead of using Tailwind theme colors or hardcoded values.
 *
 * Fonts are pre-loaded via next/font/google in lib/fonts.ts; this
 * component simply selects the right CSS variable at runtime.
 */

import { useMemo, type ReactNode } from 'react';
import type { StoreTheme } from '@mobazha/core';
import { getContrastText, RADIUS_MAP } from '@mobazha/core';
import { FONT_CSS_VAR_MAP } from '@/lib/fonts';

interface StoreThemeProviderProps {
  theme: StoreTheme;
  children: ReactNode;
}

export function StoreThemeProvider({ theme, children }: StoreThemeProviderProps) {
  const cssVars = useMemo(() => {
    const primary = theme.primaryColor || '#000000';
    const secondary = theme.secondaryColor || '#6b7280';
    const accent = theme.accentColor || '#9ca3af';
    const fontVar = FONT_CSS_VAR_MAP[theme.fontFamily] || FONT_CSS_VAR_MAP['inter'];

    return {
      '--store-primary': primary,
      '--store-secondary': secondary,
      '--store-accent': accent,
      '--store-on-primary': getContrastText(primary),
      '--store-on-secondary': getContrastText(secondary),
      '--store-on-accent': getContrastText(accent),
      '--store-font': fontVar,
      '--store-radius': RADIUS_MAP[theme.borderRadius] || RADIUS_MAP['md'],
    } as Record<string, string>;
  }, [theme]);

  return (
    <div style={cssVars} className="store-theme-root">
      {children}
    </div>
  );
}
