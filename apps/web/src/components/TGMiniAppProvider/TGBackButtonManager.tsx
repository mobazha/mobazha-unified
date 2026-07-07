'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useBackAction } from '@/lib/platform';

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
 * Routes through `useBackAction()` so the PlatformProvider TG adapter owns
 * show/hide/onClick — direct SDK calls here used to race adapter lifecycle
 * and leave BackButton hidden after adapter re-init.
 *
 * - Root tabs (Home, Orders, Cart, Me) → no handler (BackButton hidden)
 * - Checkout sub-pages with `returnUrl` → navigate to that URL
 * - All other pages → push handler, click → router.back()
 */
export function TGBackButtonManager() {
  const back = useBackAction();
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
    if (isRootTab) return;
    return back.pushHandler(handleBack);
  }, [back, isRootTab, handleBack]);

  return null;
}
