'use client';

import { useCallback } from 'react';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';

interface ShareOptions {
  url: string;
  text?: string;
}

/**
 * Platform-aware share hook.
 *
 * TG Mini App  → opens native TG share dialog via `openTelegramLink`
 * Web + Share API → navigator.share()
 * Fallback      → copy to clipboard
 */
export function useShare() {
  const { isAvailable: isTG } = useTGMiniApp();

  const share = useCallback(
    async ({ url, text }: ShareOptions) => {
      if (isTG) {
        const tgWebApp = (
          window as unknown as {
            Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } };
          }
        ).Telegram?.WebApp;
        if (tgWebApp?.openTelegramLink) {
          const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || '')}`;
          tgWebApp.openTelegramLink(shareUrl);
          return;
        }
      }

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ url, text });
          return;
        } catch {
          // User cancelled or share failed, fall through to clipboard
        }
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    },
    [isTG]
  );

  return { share, isTG };
}
