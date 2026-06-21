'use client';

import React from 'react';
import { Info } from 'lucide-react';
import {
  getExchangeUsdtWithdrawalHintKey,
  useI18n,
  isExchangeUsdtPaymentGuideLocale,
} from '@mobazha/core';

export interface ExchangeUsdtPaymentTokenHintProps {
  tokenId?: string | null;
  className?: string;
}

/** P2: dynamic withdrawal-network hint for the selected checkout token (zh/en). */
export const ExchangeUsdtPaymentTokenHint: React.FC<ExchangeUsdtPaymentTokenHintProps> = ({
  tokenId,
  className,
}) => {
  const { t, locale } = useI18n();

  if (!isExchangeUsdtPaymentGuideLocale(locale)) {
    return null;
  }

  const hintKey = getExchangeUsdtWithdrawalHintKey(tokenId);
  if (!hintKey) {
    return null;
  }

  return (
    <div
      className={`flex gap-2 rounded-lg border border-border bg-muted/40 p-3 ${className ?? ''}`}
      data-testid="exchange-usdt-payment-token-hint"
      role="note"
    >
      <Info className="w-4 h-4 shrink-0 text-primary mt-0.5" aria-hidden />
      <p className="text-xs text-muted-foreground leading-relaxed m-0">
        {t(`payment.cryptoReadiness.tokenHint.${hintKey}`)}
      </p>
    </div>
  );
};

export default ExchangeUsdtPaymentTokenHint;
