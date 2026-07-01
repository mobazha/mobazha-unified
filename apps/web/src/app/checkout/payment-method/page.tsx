'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useI18n,
  usePaymentMethods,
  syncCheckoutPaymentSessionStorage,
  persistCheckoutTokenSelection,
  persistCheckoutFiatSelection,
  sanitizeCheckoutFiatProvider,
} from '@mobazha/core';
import { PaymentCryptoSelector } from '@/components/Payment';
import { CheckoutSubpageHeader } from '@/components/Checkout/CheckoutSubpageHeader';
import { useCheckoutSubpageReturn } from '@/hooks/useCheckoutSubpageReturn';

/**
 * 移动端支付方式选择页面
 * 点击即选择并自动返回（符合移动端体验）
 */
export default function PaymentMethodPage() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { navigateBack } = useCheckoutSubpageReturn('/checkout');

  const initialTokenId = searchParams.get('selected') || undefined;
  const [initialFiatProvider] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return syncCheckoutPaymentSessionStorage().fiatProvider;
  });
  const vendorPeerID = searchParams.get('vendor') || undefined;

  const { activeFiat, crypto: acceptedCurrencies } = usePaymentMethods(vendorPeerID);
  const availableFiatProviders = useMemo(() => activeFiat.map(p => p.providerID), [activeFiat]);

  const handleSelect = useCallback(
    (tokenId: string) => {
      persistCheckoutTokenSelection(tokenId);
      navigateBack();
    },
    [navigateBack]
  );

  const handleFiatSelect = useCallback(
    (providerID: string) => {
      if (!sanitizeCheckoutFiatProvider(providerID)) return;
      persistCheckoutFiatSelection(providerID);
      navigateBack();
    },
    [navigateBack]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CheckoutSubpageHeader title={t('payment.selectPaymentMethod')} onBack={navigateBack} />

      <main className="flex-1 p-3">
        <PaymentCryptoSelector
          selectedTokenId={initialTokenId}
          selectedFiatProvider={initialFiatProvider}
          availableFiatProviders={availableFiatProviders}
          acceptedCurrencies={acceptedCurrencies}
          onSelect={handleSelect}
          onSelectFiat={handleFiatSelect}
          showFiatMethods={true}
        />
      </main>
    </div>
  );
}
