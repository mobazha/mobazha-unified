'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTGMiniApp } from './TGMiniAppProvider';

/**
 * Paths that correspond to bottom-nav root tabs.
 * BackButton is hidden on these; shown on all other pages.
 */
const ROOT_TAB_PATHS = new Set(['/', '/orders', '/cart', '/me']);

/**
 * Layout-level manager for the Telegram Mini App native BackButton.
 *
 * - Root tabs (Home, Orders, Cart, Me) → hide BackButton
 * - All other pages → show BackButton, click → router.back()
 *
 * Replaces per-page `useTGBackButton` calls. Individual pages no longer
 * need to manage BackButton visibility.
 */
export function TGBackButtonManager() {
  const { isAvailable, backButton } = useTGMiniApp();
  const router = useRouter();
  const pathname = usePathname();

  const isRootTab = ROOT_TAB_PATHS.has(pathname);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    if (!isAvailable || !backButton) return;

    if (isRootTab) {
      backButton.hide();
    } else {
      backButton.show();
      backButton.onClick(handleBack);
    }

    return () => {
      backButton.offClick(handleBack);
    };
  }, [isAvailable, backButton, isRootTab, handleBack]);

  return null;
}
