'use client';

import { useEffect } from 'react';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';

/**
 * MVP-3 A5 — Guard against accidental Mini App close during critical flows.
 *
 * On iOS Telegram clients a single downward swipe dismisses the Mini App. In
 * flows like Checkout / Listing editor / Store wizard that carry unsaved user
 * state, we call `enableClosingConfirmation()` so Telegram pops a native
 * "are you sure you want to close this?" sheet before unloading.
 *
 * Usage guidelines (per MINIAPP_MVP_EXECUTION.md §5.1 A5):
 *   1. Enable ONLY while there is unsaved state — flipping `enabled=false`
 *      after submission is important; otherwise every subsequent close prompt
 *      becomes noise.
 *   2. Cleanup always disables on unmount, so it is safe to mount/unmount on
 *      route changes without leaking the guard across screens.
 *   3. No-op outside Telegram (web / Discord / standalone) — the provider
 *      stubs `enableClosingConfirmation` / `disableClosingConfirmation` to
 *      no-ops, so consumers do not need a runtime environment check.
 */
export function useCloseGuard(enabled: boolean = true): void {
  const { isAvailable, enableClosingConfirmation, disableClosingConfirmation } = useTGMiniApp();

  useEffect(() => {
    if (!isAvailable) return;
    if (enabled) {
      enableClosingConfirmation();
    } else {
      disableClosingConfirmation();
    }
    return () => {
      disableClosingConfirmation();
    };
  }, [isAvailable, enabled, enableClosingConfirmation, disableClosingConfirmation]);
}
