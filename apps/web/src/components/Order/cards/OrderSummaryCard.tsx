'use client';

import React, { memo } from 'react';
import { useI18n, useCurrency, type DisplayOrder } from '@mobazha/core';

export interface OrderSummaryCardProps {
  displayOrder: DisplayOrder;
  statusLabel: string;
  className?: string;
}

export const OrderSummaryCard = memo(function OrderSummaryCard({
  displayOrder: order,
  statusLabel,
  className,
}: OrderSummaryCardProps) {
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();

  const breakdown = order.pricingBreakdown;
  const summaryCurrency = breakdown?.currency || order.pricingCurrency;
  const subtotal = breakdown?.subtotal || order.items[0]?.price || '0';
  const shipping = breakdown?.shipping || order.shippingAmount;
  const total = breakdown?.total || order.pricingAmount || order.total;
  const formatSummaryAmount = (amount?: string) =>
    summaryCurrency && amount ? formatCurrencyPrice(amount, summaryCurrency) : amount || '';
  const hasBreakdown = !!breakdown || !!shipping;
  const rowClass = 'flex items-center justify-between gap-4';
  const labelClass = 'text-xs text-muted-foreground';
  const valueClass = 'text-sm font-medium text-foreground tabular-nums text-right';

  return (
    <div className={`p-3.5 bg-muted/30 rounded-lg border border-border/50 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-sm font-semibold text-foreground">{t('order.summary')}</span>
        <span className="text-xs px-2 py-0.5 rounded-full border border-border/60 text-foreground bg-background/70">
          {statusLabel}
        </span>
      </div>

      {hasBreakdown ? (
        <div className="space-y-2">
          <div className={rowClass}>
            <div className={labelClass}>{t('order.subtotal')}</div>
            <div className={valueClass}>{formatSummaryAmount(subtotal)}</div>
          </div>
          <div className={rowClass}>
            <div className={labelClass}>{t('order.shippingFee')}</div>
            <div className={valueClass}>{formatSummaryAmount(shipping || '0')}</div>
          </div>
          <div className="flex items-end justify-between gap-4 mt-2 px-3 py-2 rounded-md bg-background/55 border border-border/40">
            <div className="text-xs font-medium text-foreground">{t('order.total')}</div>
            <p className="text-base font-semibold text-foreground tabular-nums text-right">
              {formatSummaryAmount(total)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-4 px-3 py-2 rounded-md bg-background/55 border border-border/40">
          <div className="text-xs font-medium text-foreground">{t('order.total')}</div>
          <p className="text-base font-semibold text-foreground tabular-nums text-right">
            {order.pricingCurrency
              ? formatCurrencyPrice(order.pricingAmount || order.total, order.pricingCurrency)
              : order.pricingAmount || order.total}
          </p>
        </div>
      )}
    </div>
  );
});
