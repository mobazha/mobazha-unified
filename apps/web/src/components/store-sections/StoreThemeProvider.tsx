'use client';

/**
 * StoreThemeProvider — PG-201
 *
 * Injects --store-* CSS custom properties based on the seller's
 * StoreConfig.theme. Children (Section components) read these vars
 * instead of using Tailwind theme colors or hardcoded values.
 *
 * The default font (Inter) is bundled locally; other
 * store fonts are loaded on demand via loadStoreFont() when the theme
 * specifies a non-default font family.
 */

import { useEffect, useMemo, type ReactNode } from 'react';
import type { StoreTheme } from '@mobazha/core';
import { getContrastText, RADIUS_MAP } from '@mobazha/core';
import { FONT_CSS_VAR_MAP, loadStoreFont } from '@/lib/fonts';

interface StoreThemeProviderProps {
  theme: StoreTheme;
  children: ReactNode;
}

export function StoreThemeProvider({ theme, children }: StoreThemeProviderProps) {
  useEffect(() => {
    loadStoreFont(theme.fontFamily);
  }, [theme.fontFamily]);

  const cssVars = useMemo(() => {
    const primary = theme.primaryColor || '#000000';
    const secondary = theme.secondaryColor || '#6b7280';
    const accent = theme.accentColor || '#9ca3af';
    const fontVar = FONT_CSS_VAR_MAP[theme.fontFamily] || FONT_CSS_VAR_MAP['inter'];

    const vars: Record<string, string> = {
      '--store-primary': primary,
      '--store-secondary': secondary,
      '--store-accent': accent,
      '--store-on-primary': getContrastText(primary),
      '--store-on-secondary': getContrastText(secondary),
      '--store-on-accent': getContrastText(accent),
      '--store-font': fontVar,
      '--store-radius': RADIUS_MAP[theme.borderRadius] || RADIUS_MAP['md'],
      // Role tokens (PG-203). --store-surface always resolves so sections can
      // paint cards with one var; the tint fallback is what card sections
      // hardcoded before roles existed.
      '--store-surface': theme.surfaceColor || `color-mix(in srgb, ${primary} 8%, transparent)`,
    };
    // bg/text stay absent unless chosen: an empty CSS var would still win the
    // cascade and knock out the app theme (including dark mode) for every
    // store that never picked page colors.
    if (theme.backgroundColor) {
      vars['--store-bg'] = theme.backgroundColor;
      vars.backgroundColor = theme.backgroundColor;
    }
    if (theme.textColor) {
      vars['--store-text'] = theme.textColor;
      vars.color = theme.textColor;
    }
    if (theme.surfaceColor) {
      vars['--store-on-surface'] = getContrastText(theme.surfaceColor);
    }
    return vars;
  }, [theme]);

  return (
    <div style={cssVars} className="store-theme-root">
      {children}
    </div>
  );
}
