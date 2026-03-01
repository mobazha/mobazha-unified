'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';

interface UseTGBackButtonOptions {
  onBack?: () => void;
  visible?: boolean;
}

/**
 * Binds the TG Mini App native BackButton to router navigation.
 *
 * When in TG environment:
 * - Shows/hides BackButton based on `visible` (default: true)
 * - On click: calls `onBack` if provided, otherwise `router.back()`
 * - Cleans up on unmount (hides button, removes listener)
 *
 * Outside TG: no-op.
 */
export function useTGBackButton({ onBack, visible = true }: UseTGBackButtonOptions = {}) {
  const { isAvailable, backButton } = useTGMiniApp();
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router]);

  useEffect(() => {
    if (!isAvailable || !backButton) return;

    if (visible) {
      backButton.show();
      backButton.onClick(handleBack);
    } else {
      backButton.hide();
    }

    return () => {
      backButton.offClick(handleBack);
      backButton.hide();
    };
  }, [isAvailable, backButton, visible, handleBack]);
}
