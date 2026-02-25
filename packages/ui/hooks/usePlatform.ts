'use client';

import { useState, useMemo } from 'react';
import { useBreakpoint, BREAKPOINTS } from './useBreakpoint';
import type { Breakpoint } from './useBreakpoint';

export type PlatformType = 'web' | 'telegram' | 'discord' | 'farcaster';

export interface PlatformInfo {
  platform: PlatformType;
  breakpoint: Breakpoint;
  windowWidth: number;

  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;

  isTGMiniApp: boolean;
  isDiscordActivity: boolean;
  isFarcasterFrame: boolean;
  isEmbeddedApp: boolean;
  isTouchDevice: boolean;

  /**
   * True when the view should render the mobile-optimized layout.
   * Combines width-based detection with embedded app context.
   */
  shouldUseMobileView: boolean;
}

function detectPlatform(): PlatformType {
  if (typeof window === 'undefined') return 'web';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;

  if (win.Telegram?.WebApp?.initData) return 'telegram';
  if (win.__DISCORD_EMBEDDED__ || new URLSearchParams(window.location.search).has('frame_id'))
    return 'discord';
  if (win.__FARCASTER_FRAME__ || window.location.ancestorOrigins?.[0]?.includes('warpcast'))
    return 'farcaster';
  return 'web';
}

function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Platform-aware hook combining responsive breakpoints with runtime
 * environment detection (Web, Telegram Mini App, etc.).
 *
 * Use `shouldUseMobileView` to decide between Desktop/Mobile view components.
 *
 * @example
 * ```tsx
 * const { shouldUseMobileView, isTGMiniApp } = usePlatform();
 * return shouldUseMobileView ? <CheckoutMobile /> : <CheckoutDesktop />;
 * ```
 */
export function usePlatform(): PlatformInfo {
  const bp = useBreakpoint();

  const [platform] = useState<PlatformType>(detectPlatform);
  const [isTouchDevice] = useState<boolean>(detectTouch);

  const isTGMiniApp = platform === 'telegram';
  const isDiscordActivity = platform === 'discord';
  const isFarcasterFrame = platform === 'farcaster';
  const isEmbeddedApp = isTGMiniApp || isDiscordActivity || isFarcasterFrame;

  const shouldUseMobileView = isEmbeddedApp || bp.isMobile;

  return useMemo(
    () => ({
      platform,
      breakpoint: bp.breakpoint,
      windowWidth: bp.windowWidth,
      isMobile: bp.isMobile,
      isTablet: bp.isTablet,
      isDesktop: bp.isDesktop,
      isLarge: bp.isLarge,
      isTGMiniApp,
      isDiscordActivity,
      isFarcasterFrame,
      isEmbeddedApp,
      isTouchDevice,
      shouldUseMobileView,
    }),
    [
      platform,
      bp.breakpoint,
      bp.windowWidth,
      bp.isMobile,
      bp.isTablet,
      bp.isDesktop,
      bp.isLarge,
      isTGMiniApp,
      isDiscordActivity,
      isFarcasterFrame,
      isEmbeddedApp,
      isTouchDevice,
      shouldUseMobileView,
    ]
  );
}

export { BREAKPOINTS, type Breakpoint };
