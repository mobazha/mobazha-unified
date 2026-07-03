'use client';

import React, { createContext, useContext, useMemo, useEffect } from 'react';

import type { PlatformCapabilities } from './types';
import {
  createTelegramAdapter,
  type TelegramAdapter,
  type TGWebAppLike,
} from './adapters/telegram';
import { createWebAdapter } from './adapters/web';
import { noopCapabilities } from './adapters/noop';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';

/**
 * MVP-1 — Platform capability Context.
 *
 * The provider picks an adapter based on runtime signals (currently:
 * "Telegram SDK present?" via `useTGMiniApp().isAvailable`). Business code
 * reads capabilities via `useCapabilities()` or one of the narrow hooks
 * (`usePrimaryCTA`, `useBackAction`, etc.).
 *
 * ### Why we layer on top of TGMiniAppProvider
 *
 * `TGMiniAppProvider` already owns the SDK lifecycle (ready(), viewport
 * listeners, theme sync). The platform context depends on it — it's a thin
 * adapter layer that translates the SDK into the channel-neutral interface.
 * Callers must render `<PlatformProvider>` *inside* `<TGMiniAppProvider>`
 * (see `apps/web/src/app/providers.tsx`).
 *
 * ### Lifecycle
 *
 * The TG adapter is created once per provider mount + per SDK object
 * identity. When the provider unmounts, we call `adapter.destroy()` to
 * release `onClick` subscriptions and hide native buttons — otherwise they'd
 * leak across a client-side re-render.
 */

const PlatformContext = createContext<PlatformCapabilities>(noopCapabilities);

interface PlatformProviderProps {
  children: React.ReactNode;
  /**
   * Override the detected channel. Mostly for tests and Storybook. In
   * production, leave this unset and the provider picks based on runtime.
   */
  forceChannel?: 'telegram' | 'web' | 'discord';
}

/**
 * Helper mainly for tests — pick adapter synchronously given explicit inputs.
 * Keeps the provider's detection logic and test fixtures in one place.
 */
export function createAdapterForChannel(
  channel: 'telegram' | 'web' | 'discord',
  sdk?: TGWebAppLike | null
): PlatformCapabilities {
  if (channel === 'telegram') {
    if (!sdk) {
      // Defensive fallback — if callsite asked for TG but gave no SDK,
      // pretend we're on Web so the UI still functions.
      return createWebAdapter();
    }
    return createTelegramAdapter(sdk);
  }
  if (channel === 'discord') {
    // Lazy import avoids pulling Discord SDK code into the main TG bundle
    // once a real SDK is added. Today it's the same as Web.
    return createWebAdapter();
  }
  return createWebAdapter();
}

export function PlatformProvider({ children, forceChannel }: PlatformProviderProps) {
  const tg = useTGMiniApp();

  // Track the current adapter so unmount can call destroy(). We create it
  // lazily inside useMemo keyed on the decision inputs, then register
  // cleanup via a separate effect.
  const adapter = useMemo<PlatformCapabilities>(() => {
    const resolvedChannel: 'telegram' | 'web' | 'discord' =
      forceChannel ?? (tg.isAvailable ? 'telegram' : 'web');

    if (resolvedChannel === 'telegram') {
      // tg.mainButton / tg.backButton / tg.haptic already reflect
      // post-ready SDK state. openTelegramLink lives on WebApp directly;
      // we splice it in via window lookup because TGMiniAppContextValue
      // doesn't currently expose it.
      const wa =
        (typeof window !== 'undefined'
          ? (window as unknown as { Telegram?: { WebApp?: TGWebAppLike } }).Telegram?.WebApp
          : undefined) ?? undefined;

      const sdkLike: TGWebAppLike = {
        MainButton: tg.mainButton ?? undefined,
        BackButton: tg.backButton ?? undefined,
        HapticFeedback: tg.haptic ?? undefined,
        showConfirm: wa?.showConfirm,
        showAlert: wa?.showAlert,
        openTelegramLink: wa?.openTelegramLink,
        showScanQrPopup: wa?.showScanQrPopup,
        closeScanQrPopup: wa?.closeScanQrPopup,
        onEvent: wa?.onEvent,
        offEvent: wa?.offEvent,
      };
      try {
        return createTelegramAdapter(sdkLike);
      } catch (err) {
        // SDK shape was incomplete (partial API on older clients); degrade
        // gracefully to Web adapter instead of breaking the app.
        if (typeof console !== 'undefined') {
          console.warn('[platform] Telegram adapter init failed, falling back to Web', err);
        }
        return createWebAdapter();
      }
    }
    return createWebAdapter();
  }, [forceChannel, tg.isAvailable, tg.mainButton, tg.backButton, tg.haptic]);

  useEffect(() => {
    const destroy = (adapter as Partial<TelegramAdapter>).destroy;
    return () => {
      if (typeof destroy === 'function') destroy.call(adapter);
    };
  }, [adapter]);

  return <PlatformContext.Provider value={adapter}>{children}</PlatformContext.Provider>;
}

/**
 * Read the full capability bundle. Prefer the narrow hooks
 * (`usePrimaryCTA`, `useBackAction`, `useConfirm`, `useHaptic`, `useShare`)
 * unless you really need cross-capability access in a single effect.
 */
export function useCapabilities(): PlatformCapabilities {
  return useContext(PlatformContext);
}
