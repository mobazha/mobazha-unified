'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n, useCurrency } from '@mobazha/core';
import { CheckoutProgressBar } from '@/components/Checkout/CheckoutProgressBar';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();

  const orderID = searchParams.get('orderID') || '';
  const title = searchParams.get('title') || '';
  const totalRaw = searchParams.get('total') || '';
  const currency = searchParams.get('currency') || 'USD';
  const vendorName = searchParams.get('vendorName') || '';
  const totalAmount = totalRaw ? parseFloat(totalRaw) : 0;

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
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
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
