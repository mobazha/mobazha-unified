'use client';

/**
 * StoreThemeProvider — PG-201
 *
 * Injects --store-* CSS custom properties based on the seller's
 * StoreConfig.theme. Children (Section components) read these vars
 * instead of using Tailwind theme colors or hardcoded values.
 */

import { useMemo, type ReactNode } from 'react';
import type { StoreTheme } from '@mobazha/core';
import { getContrastText, FONT_FAMILY_MAP, RADIUS_MAP } from '@mobazha/core';

interface StoreThemeProviderProps {
  theme: StoreTheme;
  children: ReactNode;
}

export function StoreThemeProvider({ theme, children }: StoreThemeProviderProps) {
  const cssVars = useMemo(() => {
    const primary = theme.primaryColor || '#000000';
    const secondary = theme.secondaryColor || '#6b7280';
    const accent = theme.accentColor || '#9ca3af';

    return {
      '--store-primary': primary,
      '--store-secondary': secondary,
      '--store-accent': accent,
      '--store-on-primary': getContrastText(primary),
      '--store-on-secondary': getContrastText(secondary),
      '--store-on-accent': getContrastText(accent),
      '--store-font': FONT_FAMILY_MAP[theme.fontFamily] || FONT_FAMILY_MAP['inter'],
      '--store-radius': RADIUS_MAP[theme.borderRadius] || RADIUS_MAP['md'],
    } as Record<string, string>;
  }, [theme]);

  return (
    <div style={cssVars} className="store-theme-root">
      {children}
    </div>
  );
}
