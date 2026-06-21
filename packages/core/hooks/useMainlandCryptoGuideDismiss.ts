'use client';

import { useCallback, useState } from 'react';

import { MAINLAND_GUIDE_DISMISS_STORAGE_KEY } from '../config/mainlandCryptoPaymentGuide';

function readDismissedFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MAINLAND_GUIDE_DISMISS_STORAGE_KEY) === '1';
}

export function useMainlandCryptoGuideDismiss() {
  const [dismissed, setDismissed] = useState(readDismissedFromStorage);

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MAINLAND_GUIDE_DISMISS_STORAGE_KEY, '1');
    }
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
