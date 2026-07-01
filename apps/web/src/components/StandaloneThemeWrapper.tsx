'use client';

/**
 * StandaloneThemeWrapper
 *
 * In standalone / storefront mode, bridges the store's --store-* CSS variables
 * to the global --theme-* design system so that Header, Footer, Buttons, Tabs,
 * Product Cards and all other Tailwind-powered components reflect the store's branding.
 *
 * In SaaS marketplace mode, this is a pass-through that renders children directly.
 */

import { useEffect, useMemo, type ReactNode } from 'react';
import type { StoreTheme } from '@mobazha/core';
import {
  useStorefrontMode,
  getStorefrontPeerID,
  useUserStore,
  useStorefrontConfigPublic,
  getContrastText,
  lightenHex,
  darkenHex,
  RADIUS_MAP,
} from '@mobazha/core';
import { StoreThemeProvider } from '@/components/store-sections/StoreThemeProvider';
import { FONT_CSS_VAR_MAP, loadStoreFont } from '@/lib/fonts';

interface Props {
  children: ReactNode;
}

function buildThemeBridgeVars(theme: StoreTheme): Record<string, string> {
  const primary = theme.primaryColor || '#000000';
  const radiusPx = RADIUS_MAP[theme.borderRadius] || RADIUS_MAP['md'];
  const fontVar = FONT_CSS_VAR_MAP[theme.fontFamily] || FONT_CSS_VAR_MAP['inter'];

  const radiusNum = parseInt(radiusPx, 10) || 8;
  const lgRem = `${radiusNum / 16}rem`;
  const mdRem = `${Math.max(0, radiusNum - 2) / 16}rem`;
  const smRem = `${Math.max(0, radiusNum - 4) / 16}rem`;

  return {
    '--theme-primary': primary,
    '--theme-primaryLight': lightenHex(primary, 0.25),
    '--theme-primaryDark': darkenHex(primary, 0.2),
    '--theme-accent': lightenHex(primary, 0.15),
    '--theme-textInverse': getContrastText(primary),
    '--radius-lg': lgRem,
    '--radius-md': mdRem,
    '--radius-sm': smRem,
    fontFamily: fontVar,
  };
}

export function StandaloneThemeWrapper({ children }: Props) {
  const storeLike = useStorefrontMode();
  const { profile } = useUserStore();
  const storefrontPeerID = getStorefrontPeerID();
  const peerId = storeLike ? storefrontPeerID || profile?.peerID || null : null;
  const { config } = useStorefrontConfigPublic(peerId);

  const theme = storeLike ? config?.theme : undefined;

  useEffect(() => {
    if (theme) loadStoreFont(theme.fontFamily);
  }, [theme]);

  const bridgeVars = useMemo(() => (theme ? buildThemeBridgeVars(theme) : undefined), [theme]);

  if (storeLike && theme) {
    return (
      <StoreThemeProvider theme={theme}>
        <div style={bridgeVars}>{children}</div>
      </StoreThemeProvider>
    );
  }

  return <>{children}</>;
}
