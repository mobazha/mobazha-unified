'use client';

import { useState, useEffect, useMemo } from 'react';
import { useBreakpoint, BREAKPOINTS } from './useBreakpoint';
import type { Breakpoint } from './useBreakpoint';

export type PlatformType = 'web' | 'telegram' | 'discord' | 'farcaster' | 'extension';

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
  isChromeExtension: boolean;
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

  if (
    typeof globalThis !== 'undefined' &&
    'chrome' in globalThis &&
    (globalThis as any).chrome?.runtime?.id
  )
    return 'extension';
  if (win.Telegram?.WebApp) return 'telegram';
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

  const [platform, setPlatform] = useState<PlatformType>(detectPlatform);
  const [isTouchDevice] = useState<boolean>(detectTouch);

  // Re-detect after mount: catches late-injected SDKs (Telegram WebApp, Discord, etc.)
  useEffect(() => {
    const detected = detectPlatform();
    if (detected !== platform) {
      setPlatform(detected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTGMiniApp = platform === 'telegram';
  const isDiscordActivity = platform === 'discord';
  const isFarcasterFrame = platform === 'farcaster';
  const isChromeExtension = platform === 'extension';
  const isEmbeddedApp = isTGMiniApp || isDiscordActivity || isFarcasterFrame || isChromeExtension;

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
      isChromeExtension,
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
      isChromeExtension,
      isEmbeddedApp,
      isTouchDevice,
      shouldUseMobileView,
    ]
  );
}

export { BREAKPOINTS, type Breakpoint };
