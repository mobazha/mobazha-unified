'use client';

import { useCallback, useState } from 'react';
import { startTelegramBind } from '@mobazha/core';
import { useTGMiniApp } from '../components/TGMiniAppProvider/TGMiniAppProvider';

/**
 * Hook for triggering the Telegram account binding flow (server-side OAuth closed loop).
 *
 * Flow:
 * 1. Call `startBind()` — backend creates a Redis session and returns a Casdoor OAuth URL
 * 2. `openLink()` opens the OAuth URL in an external browser
 * 3. User completes Casdoor login in the browser
 * 4. Backend binds the account and redirects back to Mini App via t.me deep link
 * 5. Mini App re-opens with `start_param=bind_SESSION_ID`
 * 6. `AuthProvider` detects the binding return and calls `completeTelegramBind`
 */
export function useMiniAppBind() {
  const tg = useTGMiniApp();
  const [isBinding, setIsBinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startBind = useCallback(async () => {
    if (!tg.isAvailable || !tg.initData) {
      setError('Telegram Mini App not available');
      return;
    }

    setIsBinding(true);
    setError(null);

    try {
      const result = await startTelegramBind(tg.initData);
      // Open the OAuth URL in an external browser
      tg.openLink(result.oauthUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start binding';
      setError(msg);
    } finally {
      setIsBinding(false);
    }
  }, [tg]);

  return {
    startBind,
    isBinding,
    error,
  };
}
