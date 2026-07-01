'use client';

import { useCallback, useRef, useState } from 'react';
import { applyBasePriceToAllSkus, countExplicitSkuPrices } from '@mobazha/core';
import type { SkuItem } from '@mobazha/core/hooks/useListingForm';

interface PendingPriceSync {
  newPrice: string;
  variantCount: number;
}

interface UseListingPriceChangeOptions {
  price: string;
  skus: SkuItem[];
  onPriceChange: (value: string) => void;
  onSkusChange: (skus: SkuItem[]) => void;
  onReviewVariants?: () => void;
}

export function useListingPriceChange({
  price,
  skus,
  onPriceChange,
  onSkusChange,
  onReviewVariants,
}: UseListingPriceChangeOptions) {
  const [pendingSync, setPendingSync] = useState<PendingPriceSync | null>(null);
  const priceAtFocusRef = useRef(price);

  const handlePriceInput = useCallback(
    (newPrice: string) => {
      onPriceChange(newPrice);
    },
    [onPriceChange]
  );

  const handlePriceFocus = useCallback(() => {
    priceAtFocusRef.current = price;
  }, [price]);

  const handlePriceBlur = useCallback(
    (currentPrice: string) => {
      const variantCount = countExplicitSkuPrices(skus);
      if (variantCount > 0 && currentPrice !== priceAtFocusRef.current) {
        setPendingSync({ newPrice: currentPrice, variantCount });
      }
    },
    [skus]
  );

  const applyBaseOnly = useCallback(() => {
    if (!pendingSync) return;
    onPriceChange(pendingSync.newPrice);
    setPendingSync(null);
  }, [onPriceChange, pendingSync]);

  const applyToAllVariants = useCallback(() => {
    if (!pendingSync) return;
    onPriceChange(pendingSync.newPrice);
    onSkusChange(applyBasePriceToAllSkus(skus, pendingSync.newPrice));
    setPendingSync(null);
  }, [onPriceChange, onSkusChange, pendingSync, skus]);

  const reviewVariants = useCallback(() => {
    if (!pendingSync) return;
    onPriceChange(pendingSync.newPrice);
    setPendingSync(null);
    onReviewVariants?.();
  }, [onPriceChange, onReviewVariants, pendingSync]);

  return {
    pendingSync,
    setPendingSync,
    handlePriceInput,
    handlePriceFocus,
    handlePriceBlur,
    applyBaseOnly,
    applyToAllVariants,
    reviewVariants,
  };
}
