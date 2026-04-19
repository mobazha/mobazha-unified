'use client';

import { useCallback, useRef } from 'react';
import { useUserStore } from '@mobazha/core';
import {
  registerTelegram,
  registerDiscord,
  buildTelegramMiniAppStoreContextFromWindow,
} from '@mobazha/core';
import { useTGMiniApp } from '../components/TGMiniAppProvider/TGMiniAppProvider';
import { useHaptic } from '@/lib/platform';

export type RegisterAction = 'register' | 'bind' | 'cancel' | 'error';

interface UseMiniAppRegisterOptions {
  onBindRequested?: () => void;
}

/**
 * Hook for triggering Mini App registration with platform-native UI.
 *
 * - Telegram Bot API >= 6.2: uses showPopup with 3 buttons (Register / I have an account / Cancel)
 * - Telegram Bot API < 6.2: uses showConfirm (OK = register, Cancel = dismiss)
 * - Discord / fallback: returns `promptRegister` that the caller can wire to a BottomSheet
 *
 * Includes a concurrency lock to prevent duplicate registration.
 */
export function useMiniAppRegister(options?: UseMiniAppRegisterOptions) {
  // NOTE (MVP-1 partial migration): `showPopup` (3-button) and `showConfirm`
  // still come from the Telegram-specific provider — `useConfirm` only abstracts
  // the 2-choice case and `showPopup` has no generic fallback yet. Haptic calls,
  // however, move to the platform-abstract `useHaptic()` below.
  const tg = useTGMiniApp();
  const haptic = useHaptic();
  const { loginMiniApp, authSource } = useUserStore();
  const isRegistering = useRef(false);

  const doRegister = useCallback(async (): Promise<boolean> => {
    if (isRegistering.current) return false;
    isRegistering.current = true;

    try {
      const platform = authSource as 'telegram' | 'discord';
      if (platform === 'telegram' && tg.initData) {
        const token = await registerTelegram(
          tg.initData,
          buildTelegramMiniAppStoreContextFromWindow()
        );
        return await loginMiniApp(token, 'telegram');
      }
      if (platform === 'discord') {
        const accessToken = new URLSearchParams(window.location.search).get('access_token');
        if (accessToken) {
          const token = await registerDiscord(accessToken);
          return await loginMiniApp(token, 'discord');
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      isRegistering.current = false;
    }
  }, [authSource, tg.initData, loginMiniApp]);

  /**
   * Show platform-native registration prompt.
   * Returns the action the user chose, or null if the platform doesn't support native prompts.
   */
  const promptRegister = useCallback(async (): Promise<RegisterAction | null> => {
    if (!tg.isAvailable) {
      // Non-TG platforms (Discord, etc.) — caller should show their own UI
      return null;
    }

    const supportsPopup = tg.version && compareVersions(tg.version, '6.2') >= 0;

    if (supportsPopup) {
      const buttonId = await tg.showPopup({
        title: 'Create Account',
        message: 'Create a free account to place orders, save favorites, and track purchases.',
        buttons: [
          { id: 'register', type: 'default', text: 'Create Account' },
          { id: 'bind', type: 'default', text: 'I have an account' },
          { id: 'cancel', type: 'cancel' },
        ],
      });

      if (buttonId === 'register') {
        haptic.impact('medium');
        const success = await doRegister();
        return success ? 'register' : 'error';
      }

      if (buttonId === 'bind') {
        options?.onBindRequested?.();
        return 'bind';
      }

      return 'cancel';
    }

    // Fallback for older Bot API: showConfirm (2-button)
    const confirmed = await tg.showConfirm(
      'Create a free account to place orders and track purchases?'
    );

    if (confirmed) {
      haptic.impact('medium');
      const success = await doRegister();
      return success ? 'register' : 'error';
    }

    return 'cancel';
  }, [tg, doRegister, options, haptic]);

  return {
    promptRegister,
    doRegister,
    isRegistering: isRegistering.current,
  };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
