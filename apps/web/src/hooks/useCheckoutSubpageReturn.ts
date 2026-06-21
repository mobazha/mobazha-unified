'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Mobile checkout sub-pages (payment-method, moderator) carry a `returnUrl`
 * query param. Always navigate back via that URL — not `router.back()` —
 * so cross-store headers and payment context survive the round trip.
 */
export function useCheckoutSubpageReturn(defaultReturnUrl = '/checkout') {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || defaultReturnUrl;

  const navigateBack = useCallback(() => {
    router.push(returnUrl);
  }, [router, returnUrl]);

  return { returnUrl, navigateBack };
}
