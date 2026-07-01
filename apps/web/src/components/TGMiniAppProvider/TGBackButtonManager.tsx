'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTGMiniApp } from './TGMiniAppProvider';

/**
 * Paths that correspond to bottom-nav root tabs.
 * BackButton is hidden on these; shown on all other pages.
 */
const ROOT_TAB_PATHS = new Set(['/', '/orders', '/cart', '/chat', '/me']);

/** Mobile checkout sub-pages pass an explicit return target. */
const RETURN_URL_PATHS = new Set(['/checkout/payment-method', '/checkout/moderator']);

/**
 * Layout-level manager for the Telegram Mini App native BackButton.
 *
 * - Root tabs (Home, Orders, Cart, Me) → hide BackButton
 * - Checkout sub-pages with `returnUrl` → navigate to that URL
 * - All other pages → show BackButton, click → router.back()
 */
export function TGBackButtonManager() {
  const { isAvailable, backButton } = useTGMiniApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isRootTab = ROOT_TAB_PATHS.has(pathname);
  const returnUrl = RETURN_URL_PATHS.has(pathname) ? searchParams.get('returnUrl') : null;

  const handleBack = useCallback(() => {
    if (returnUrl) {
      router.push(returnUrl);
      return;
    }
    router.back();
  }, [returnUrl, router]);

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
