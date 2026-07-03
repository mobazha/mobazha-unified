'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useI18n,
  usePaymentMethods,
  syncCheckoutPaymentSessionStorage,
  persistCheckoutTokenSelection,
  persistCheckoutFiatSelection,
  sanitizeCheckoutFiatProvider,
  isFiatAllowedByCheckoutPaymentPolicy,
  normalizeCheckoutPaymentPolicy,
  readCheckoutPaymentPolicyFromSession,
  type CheckoutPaymentPolicy,
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
  const paymentPolicy = useMemo<CheckoutPaymentPolicy>(() => {
    const fromQuery = searchParams.get('paymentPolicy');
    if (fromQuery) return normalizeCheckoutPaymentPolicy(fromQuery);
    if (typeof window === 'undefined') return 'all';
    return readCheckoutPaymentPolicyFromSession();
  }, [searchParams]);

  const [initialFiatProvider] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return syncCheckoutPaymentSessionStorage({ paymentPolicy }).fiatProvider;
  });
  const vendorPeerID = searchParams.get('vendor') || undefined;

  useEffect(() => {
    syncCheckoutPaymentSessionStorage({ paymentPolicy });
  }, [paymentPolicy]);

  const { activeFiat, crypto: acceptedCurrencies } = usePaymentMethods(vendorPeerID);
  const availableFiatProviders = useMemo(() => activeFiat.map(p => p.providerID), [activeFiat]);
  const showFiatMethods = isFiatAllowedByCheckoutPaymentPolicy(paymentPolicy);

  const handleSelect = useCallback(
    (tokenId: string) => {
      persistCheckoutTokenSelection(tokenId);
      navigateBack();
    },
    [navigateBack]
  );

  const handleFiatSelect = useCallback(
    (providerID: string) => {
      if (!showFiatMethods || !sanitizeCheckoutFiatProvider(providerID)) return;
      persistCheckoutFiatSelection(providerID);
      navigateBack();
    },
    [navigateBack, showFiatMethods]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CheckoutSubpageHeader title={t('payment.selectPaymentMethod')} onBack={navigateBack} />

      <main className="flex-1 p-3">
        {!showFiatMethods ? (
          <p
            className="mb-3 text-xs text-muted-foreground"
            data-testid="checkout-payment-policy-note"
          >
            {t('collectibles.checkout.escrowCryptoOnlyNote')}
          </p>
        ) : null}
        <PaymentCryptoSelector
          selectedTokenId={initialTokenId}
          selectedFiatProvider={initialFiatProvider}
          availableFiatProviders={availableFiatProviders}
          acceptedCurrencies={acceptedCurrencies}
          onSelect={handleSelect}
          onSelectFiat={handleFiatSelect}
          showFiatMethods={showFiatMethods}
        />
      </main>
    </div>
  );
}
