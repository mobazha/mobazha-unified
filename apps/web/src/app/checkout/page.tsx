'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePlatform } from '@mobazha/ui';
import { useI18n } from '@mobazha/core';
import { CheckoutDesktop, CheckoutMobile } from '@/components/Checkout';
import { useCheckout } from '@/hooks/useCheckout';
import { Header } from '@/components';

function CheckoutError() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div
        className="flex flex-col items-center justify-center py-24 px-4 text-center"
        data-testid="checkout-error"
      >
        <div className="text-destructive text-5xl mb-4">!</div>
        <h2 className="text-xl font-semibold mb-2">{t('checkout.loadFailed')}</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{t('checkout.loadFailedDesc')}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('common.backToHome')}
        </Link>
      </div>
    </div>
  );
}

function CheckoutContent() {
  const { isMobile } = usePlatform();
  const checkout = useCheckout();

  if (checkout.error && !checkout.isLoading && checkout.checkoutItems.length === 0) {
    return <CheckoutError />;
  }

  if (isMobile) {
    return <CheckoutMobile checkout={checkout} />;
  }
  return <CheckoutDesktop checkout={checkout} />;
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}
