// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useCurrency, useI18n } from '@mobazha/core';
import type { PaymentSelectionQuote } from '@mobazha/core';
import {
  formatPaymentSelectionConversionRate,
  formatPaymentSelectionQuoteAmount,
} from '@mobazha/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { cn } from '@/lib/utils';

export interface PaymentSelectionQuoteReviewProps {
  quote: PaymentSelectionQuote | null;
  loading?: boolean;
  error?: string | null;
  expired?: boolean;
  provisioned?: boolean;
  onRequote?: () => void;
  requoteLoading?: boolean;
  className?: string;
}

interface QuoteCountdown {
  expired: boolean;
  minutes: number;
  seconds: number;
}

function resolveQuoteCountdown(expiresAt: string | undefined, now: number): QuoteCountdown {
  if (!expiresAt) return { expired: false, minutes: 0, seconds: 0 };
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) return { expired: false, minutes: 0, seconds: 0 };

  const remainingMs = expiresMs - now;
  if (remainingMs <= 0) return { expired: true, minutes: 0, seconds: 0 };

  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    expired: false,
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

function QuoteLine({
  label,
  amount,
  divisibility,
  formatCoin,
  displayCurrency,
  testId,
  emphasize = false,
}: {
  label: string;
  amount: string;
  divisibility: number;
  formatCoin: string;
  displayCurrency: string;
  testId: string;
  emphasize?: boolean;
}) {
  const { renderPairedPrice } = useCurrency();
  const formatted = formatPaymentSelectionQuoteAmount(amount, divisibility, formatCoin);

  return (
    <div className="flex items-center justify-between gap-3 text-sm" data-testid={testId}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-medium tabular-nums text-right',
          emphasize && 'text-base font-semibold text-primary'
        )}
      >
        {renderPairedPrice(formatted, displayCurrency, { isMinimalUnit: false })}
      </dd>
    </div>
  );
}

export function PaymentSelectionQuoteReview({
  quote,
  loading = false,
  error = null,
  expired = false,
  provisioned = false,
  onRequote,
  requoteLoading = false,
  className,
}: PaymentSelectionQuoteReviewProps) {
  const { t } = useI18n();
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!quote?.expiresAt) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [quote?.expiresAt]);

  const countdown = useMemo(
    () => resolveQuoteCountdown(quote?.expiresAt, now),
    [quote?.expiresAt, now]
  );
  const showExpired = !provisioned && (expired || countdown.expired);

  if (loading) {
    return (
      <Card className={className} data-testid="payment-selection-quote-loading">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('payment.selectionQuote.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className} data-testid="payment-selection-quote-error">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                {t('payment.selectionQuote.errorTitle')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('payment.selectionQuote.errorHint')}
              </p>
              {onRequote && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11 touch-feedback mt-4"
                  onClick={onRequote}
                  disabled={requoteLoading}
                  data-testid="payment-selection-quote-requote"
                >
                  <RefreshCw className={cn('w-4 h-4 mr-2', requoteLoading && 'animate-spin')} />
                  {t('payment.selectionQuote.requote')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quote) return null;

  const paymentCoin = quote.paymentCoin;
  const displayCurrency = quote.paymentCurrency;

  return (
    <Card className={className} data-testid="payment-selection-quote-review">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('payment.selectionQuote.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('payment.selectionQuote.hint')}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="space-y-2">
          <QuoteLine
            label={t('payment.selectionQuote.paymentSubtotal')}
            amount={quote.paymentSubtotal}
            divisibility={quote.paymentDivisibility}
            formatCoin={paymentCoin}
            displayCurrency={displayCurrency}
            testId="payment-selection-quote-subtotal"
          />
          <QuoteLine
            label={t('payment.selectionQuote.providerOrNetworkCost')}
            amount={quote.providerOrNetworkCost}
            divisibility={quote.paymentDivisibility}
            formatCoin={paymentCoin}
            displayCurrency={displayCurrency}
            testId="payment-selection-quote-provider-cost"
          />
          <QuoteLine
            label={t('payment.selectionQuote.platformPaymentCost')}
            amount={quote.platformPaymentCost}
            divisibility={quote.paymentDivisibility}
            formatCoin={paymentCoin}
            displayCurrency={displayCurrency}
            testId="payment-selection-quote-platform-cost"
          />
        </dl>

        {quote.conversionRequired && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="payment-selection-quote-conversion-rate"
          >
            {t('payment.selectionQuote.conversionRate')}:{' '}
            {formatPaymentSelectionConversionRate(quote)}
          </p>
        )}

        <p className="text-xs text-muted-foreground" data-testid="payment-selection-quote-policy">
          {t('payment.selectionQuote.policyVersion', { version: quote.policyVersion })}
        </p>

        <Separator />

        <QuoteLine
          label={t('payment.selectionQuote.buyerPaymentTotal')}
          amount={quote.buyerPaymentTotal}
          divisibility={quote.paymentDivisibility}
          formatCoin={paymentCoin}
          displayCurrency={displayCurrency}
          testId="payment-selection-quote-total"
          emphasize
        />

        <div
          className={cn(
            'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1',
            showExpired && 'text-destructive'
          )}
          data-testid="payment-selection-quote-expiry"
        >
          <p className="text-sm" role="status" aria-live="polite">
            {provisioned
              ? t('payment.selectionQuote.provisioned')
              : showExpired
                ? t('payment.selectionQuote.expired')
                : t('payment.selectionQuote.expiresIn', {
                    minutes: countdown.minutes,
                    seconds: countdown.seconds,
                  })}
          </p>
          {onRequote && !provisioned && (
            <Button
              type="button"
              size="sm"
              variant={showExpired ? 'default' : 'outline'}
              className="min-h-11 touch-feedback w-full sm:w-auto"
              onClick={onRequote}
              disabled={requoteLoading}
              data-testid="payment-selection-quote-requote"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', requoteLoading && 'animate-spin')} />
              {t('payment.selectionQuote.requote')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PaymentSelectionQuoteReview;
