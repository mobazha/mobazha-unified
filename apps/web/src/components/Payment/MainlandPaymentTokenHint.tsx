'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getMainlandWithdrawalHintKey,
  useI18n,
  isMainlandCryptoPaymentGuideLocale,
} from '@mobazha/core';

export interface MainlandPaymentTokenHintProps {
  tokenId?: string;
  className?: string;
}

/** P2: dynamic withdrawal-network hint for the selected checkout token (zh locale only). */
export const MainlandPaymentTokenHint: React.FC<MainlandPaymentTokenHintProps> = ({
  tokenId,
  className,
}) => {
  const { t, locale } = useI18n();

  if (!isMainlandCryptoPaymentGuideLocale(locale)) {
    return null;
  }

  const hintKey = getMainlandWithdrawalHintKey(tokenId);
  if (!hintKey) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5',
        className
      )}
      data-testid="mainland-payment-token-hint"
      role="note"
    >
      <Info className="w-4 h-4 shrink-0 text-primary mt-0.5" aria-hidden />
      <p className="text-xs text-foreground leading-relaxed m-0">
        {t(`payment.cryptoReadiness.tokenHint.${hintKey}`)}
      </p>
    </div>
  );
};

export default MainlandPaymentTokenHint;
