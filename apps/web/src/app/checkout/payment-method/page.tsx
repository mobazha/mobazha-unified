'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useI18n, usePaymentMethods } from '@mobazha/core';
import { PaymentCryptoSelector } from '@/components/Payment';

/**
 * 移动端支付方式选择页面
 * 点击即选择并自动返回（符合移动端体验）
 */
export default function PaymentMethodPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const initialTokenId = searchParams.get('selected') || undefined;
  const [initialFiatProvider] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const saved = window.sessionStorage.getItem('checkout_selected_fiat_provider');
    return saved || undefined;
  });
  const vendorPeerID = searchParams.get('vendor') || undefined;
  const returnUrl = searchParams.get('returnUrl') || '/checkout';

  const { activeFiat, crypto: acceptedCurrencies } = usePaymentMethods(vendorPeerID);
  const availableFiatProviders = useMemo(() => activeFiat.map(p => p.providerID), [activeFiat]);

  const handleSelect = useCallback(
    (tokenId: string) => {
      sessionStorage.setItem('checkout_selected_token', tokenId);
      sessionStorage.removeItem('checkout_selected_fiat_provider');
      router.push(returnUrl);
    },
    [returnUrl, router]
  );

  const handleFiatSelect = useCallback(
    (providerID: string) => {
      sessionStorage.setItem('checkout_selected_fiat_provider', providerID);
      sessionStorage.removeItem('checkout_selected_token');
      router.push(returnUrl);
    },
    [returnUrl, router]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4 gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-full text-foreground touch-feedback active:bg-muted/50"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-foreground">{t('payment.selectPaymentMethod')}</span>
        </div>
      </header>

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
