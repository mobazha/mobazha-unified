'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n, useCurrency, ordersApi, toMinimalUnit } from '@mobazha/core';
import { CheckoutProgressBar } from '@/components/Checkout/CheckoutProgressBar';
import { ShareButton } from '@/components/Share';
import { ShieldCheck, Bell, FileSearch } from 'lucide-react';

function buildFiatPaymentCoin(providerID: string, currency: string): string {
  const provider = (providerID || '').trim().toLowerCase();
  const resolvedCurrency = (currency || '').trim().toUpperCase() || 'USD';
  if (!provider) {
    throw new Error('fiat provider is required');
  }
  return `fiat:${provider}:${resolvedCurrency}`;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();

  const orderID = searchParams.get('orderID') || '';
  const redirectStatus = searchParams.get('redirect_status');
  const stripePaymentIntent = searchParams.get('payment_intent') || '';
  const urlPaymentID = searchParams.get('paymentID') || '';
  const title = searchParams.get('title') || '';
  const totalRaw = searchParams.get('total') || '';
  const currency = searchParams.get('currency') || 'USD';
  const fiatProviderRaw = searchParams.get('fiatProvider') || '';
  const fiatAmountRaw = searchParams.get('fiatAmount') || '';
  const vendorName = searchParams.get('vendorName') || '';
  const slug = searchParams.get('slug') || '';
  const totalAmount = totalRaw ? parseFloat(totalRaw) : 0;
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const productShareUrl = slug ? `${siteUrl}/product/${slug}` : '';
  const submitAttemptedRef = useRef(false);

  useEffect(() => {
    if (submitAttemptedRef.current) return;
    if (redirectStatus !== 'succeeded' || !orderID) return;
    submitAttemptedRef.current = true;

    const providerID = (fiatProviderRaw || (stripePaymentIntent ? 'stripe' : '')).toLowerCase();
    const transactionID = stripePaymentIntent || urlPaymentID;
    if (!providerID || !transactionID) return;

    const amountFromUrl = Number(fiatAmountRaw);
    const amount =
      Number.isFinite(amountFromUrl) && amountFromUrl > 0
        ? Math.floor(amountFromUrl)
        : totalAmount > 0
          ? toMinimalUnit(totalAmount, currency)
          : 0;
    if (amount <= 0) return;

    void ordersApi
      .submitPayment({
        orderID,
        transactionID,
        coin: buildFiatPaymentCoin(providerID, currency),
        amount,
        timestamp: new Date().toISOString(),
        method: 5, // FIAT
      })
      .catch(err => {
        console.warn('[CheckoutConfirmation] submitPayment fallback failed:', err);
      });
  }, [
    currency,
    fiatAmountRaw,
    fiatProviderRaw,
    orderID,
    redirectStatus,
    stripePaymentIntent,
    totalAmount,
    urlPaymentID,
  ]);

  return (
    <div className="min-h-screen bg-background" data-testid="order-confirmation-page">
      <Header />
      <MobilePageHeader title={t('checkout.orderConfirmed')} showBack={false} />

      <main className="py-8">
        <Container size="md">
          <CheckoutProgressBar currentStep="confirmation" className="mb-8" />

          <Card className="max-w-lg mx-auto">
            <CardContent className="p-6 sm:p-8">
              <VStack gap="lg" align="center" className="text-center">
                {/* Success icon */}
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                    {t('checkout.orderConfirmed')}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t('checkout.orderConfirmedDesc')}
                  </p>
                </div>

                {/* Order summary */}
                <div className="w-full bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  {orderID && (
                    <HStack justify="between">
                      <span className="text-sm text-muted-foreground">{t('checkout.orderId')}</span>
                      <span className="text-sm font-mono text-foreground truncate max-w-[180px]">
                        {orderID.slice(0, 12)}...
                      </span>
                    </HStack>
                  )}
                  {title && (
                    <HStack justify="between">
                      <span className="text-sm text-muted-foreground">{t('checkout.item')}</span>
                      <span className="text-sm text-foreground truncate max-w-[180px]">
                        {title}
                      </span>
                    </HStack>
                  )}
                  {vendorName && (
                    <HStack justify="between">
                      <span className="text-sm text-muted-foreground">{t('checkout.seller')}</span>
                      <span className="text-sm text-foreground">{vendorName}</span>
                    </HStack>
                  )}
                  {totalAmount > 0 && (
                    <HStack justify="between" className="pt-2 border-t border-border">
                      <span className="text-sm font-semibold text-foreground">
                        {t('checkout.total')}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {renderPairedPrice(totalAmount, currency, { isMinimalUnit: false })}
                      </span>
                    </HStack>
                  )}
                </div>

                {/* Next steps */}
                <div className="w-full space-y-3 text-left">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('checkout.nextStepsTitle')}
                  </h3>
                  <div className="flex items-start gap-3">
                    <Bell className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{t('checkout.nextStepsSeller')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 mt-0.5 text-success flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{t('checkout.nextStepsEscrow')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileSearch className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{t('checkout.nextStepsTrack')}</p>
                  </div>
                </div>

                {/* Actions */}
                <VStack gap="sm" className="w-full">
                  {orderID && (
                    <Link href={`/orders/${orderID}`} className="w-full">
                      <Button size="lg" className="w-full" data-testid="view-order-btn">
                        {t('checkout.viewOrder')}
                      </Button>
                    </Link>
                  )}
                  <Link href="/" className="w-full">
                    <Button variant="outline" size="lg" className="w-full">
                      {t('checkout.continueShopping')}
                    </Button>
                  </Link>
                  {productShareUrl && title && (
                    <div className="flex justify-center pt-2">
                      <ShareButton
                        url={productShareUrl}
                        title={title}
                        description={vendorName ? `${title} by ${vendorName}` : title}
                      />
                    </div>
                  )}
                </VStack>
              </VStack>
            </CardContent>
          </Card>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}
