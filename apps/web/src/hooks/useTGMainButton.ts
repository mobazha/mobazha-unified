'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';

interface UseTGMainButtonOptions {
  text: string;
  onClick: () => void;
  visible?: boolean;
  disabled?: boolean;
  showProgress?: boolean;
}

/**
 * Binds the TG Mini App native MainButton to a page action.
 *
 * When in TG environment:
 * - Shows MainButton with given text
 * - Binds click handler
 * - Supports disabled state and loading progress
 * - Cleans up on unmount (hides button, removes listener)
 *
 * Outside TG: no-op.
 */
export function useTGMainButton({
  text,
  onClick,
  visible = true,
  disabled = false,
  showProgress = false,
}: UseTGMainButtonOptions) {
  const { isAvailable, mainButton } = useTGMiniApp();
  const callbackRef = useRef(onClick);

  useEffect(() => {
    callbackRef.current = onClick;
  }, [onClick]);

  const stableOnClick = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!isAvailable || !mainButton) return;

    if (!visible) {
      mainButton.hide();
      return () => {};
    }

    mainButton.setText(text);
    mainButton.show();
    mainButton.onClick(stableOnClick);

    if (disabled) {
      mainButton.disable();
    } else {
      mainButton.enable();
    }

    if (showProgress) {
      mainButton.showProgress(true);
    } else {
      mainButton.hideProgress();
    }

    return () => {
      mainButton.offClick(stableOnClick);
      mainButton.hide();
    };
  }, [isAvailable, mainButton, text, visible, disabled, showProgress, stableOnClick]);
}
