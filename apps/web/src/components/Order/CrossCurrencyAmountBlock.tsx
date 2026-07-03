'use client';

import React, { memo } from 'react';
import {
  useI18n,
  useCurrency,
  formatPaymentAmount,
  resolveOrderPricingDisplay,
  isCrossCurrencyOrderPayment,
  resolvePaymentDisplayLabel,
  type DisplayOrderPricingBreakdown,
} from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface CrossCurrencyAmountBlockProps {
  /** Settlement / payment amount (formatted) */
  amount: string;
  /** Payment display currency label */
  currency: string;
  paymentCoin?: string;
  pricingAmount?: string;
  pricingCurrency?: string;
  pricingBreakdown?: Pick<DisplayOrderPricingBreakdown, 'total' | 'currency'>;
  /** payment-card: listing small + paid prominent; timeline: listing prominent + paid secondary */
  variant?: 'payment-card' | 'timeline';
  suffix?: React.ReactNode;
  className?: string;
}

/**
 * Dual-line amount display for cross-currency orders (e.g. USD listing, ETH payment).
 * Uses order snapshot pricing — no live FX conversion.
 */
export const CrossCurrencyAmountBlock = memo(function CrossCurrencyAmountBlock({
  amount,
  currency,
  paymentCoin,
  pricingAmount,
  pricingCurrency,
  pricingBreakdown,
  variant = 'payment-card',
  suffix,
  className,
}: CrossCurrencyAmountBlockProps) {
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();

  const paymentLabel = resolvePaymentDisplayLabel(paymentCoin, currency);
  const pricing = resolveOrderPricingDisplay({
    pricingBreakdown,
    pricingAmount,
    pricingCurrency,
  });
  const isCrossCurrency = isCrossCurrencyOrderPayment(pricing, paymentCoin, paymentLabel);

  const formattedPayment =
    formatPaymentAmount(amount, paymentCoin, paymentLabel) ??
    formatCurrencyPrice(amount, paymentLabel);

  if (!isCrossCurrency || !pricing) {
    return (
      <p
        className={cn(
          'text-foreground tabular-nums',
          variant === 'timeline'
            ? 'text-base sm:text-lg font-semibold'
            : 'text-sm sm:text-base font-semibold flex items-center gap-1',
          className
        )}
      >
        {formattedPayment}
        {suffix}
      </p>
    );
  }

  const formattedPricing = formatCurrencyPrice(pricing.amount, pricing.currency);

  if (variant === 'timeline') {
    return (
      <div className={cn('space-y-0.5', className)}>
        <p className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
          {formattedPricing}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums flex items-center gap-1 flex-wrap">
          <span className="text-xs font-normal">{t('order.payment.paidAmount')}</span>
          <span className="font-medium text-foreground/90">{formattedPayment}</span>
          {suffix}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">
        {t('order.payment.listingTotal')}{' '}
        <span className="font-medium text-foreground">{formattedPricing}</span>
      </p>
      <p className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-1 mt-0.5">
        <span className="text-xs font-normal text-muted-foreground mr-1">
          {t('order.payment.paidAmount')}
        </span>
        {formattedPayment}
        {suffix}
      </p>
    </div>
  );
});
