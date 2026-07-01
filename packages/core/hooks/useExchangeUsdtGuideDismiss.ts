'use client';

import { useCallback, useState } from 'react';

import { EXCHANGE_USDT_GUIDE_DISMISS_STORAGE_KEY } from '../config/exchangeUsdtPaymentGuide';

function readDismissedFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(EXCHANGE_USDT_GUIDE_DISMISS_STORAGE_KEY) === '1';
}

export function useExchangeUsdtGuideDismiss() {
  const [dismissed, setDismissed] = useState(readDismissedFromStorage);

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(EXCHANGE_USDT_GUIDE_DISMISS_STORAGE_KEY, '1');
    }
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
