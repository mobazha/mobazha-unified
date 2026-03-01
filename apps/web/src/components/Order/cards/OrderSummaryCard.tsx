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

  const hasShipping = !!order.shippingAmount;

  return (
    <div className={`p-3 bg-muted/30 rounded-lg border border-border/50 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">{t('order.summary')}</span>
        <span className="text-xs px-2 py-0.5 rounded-full border border-border/60 text-foreground bg-background/60">
          {statusLabel}
        </span>
      </div>

      {hasShipping ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{t('order.subtotal')}</div>
            <div className="text-xs text-foreground">
              {order.pricingCurrency
                ? formatCurrencyPrice(order.items[0]?.price || '0', order.pricingCurrency)
                : order.items[0]?.price || ''}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{t('order.shippingFee')}</div>
            <div className="text-xs text-foreground">
              {order.pricingCurrency
                ? formatCurrencyPrice(order.shippingAmount!, order.pricingCurrency)
                : order.shippingAmount}
            </div>
          </div>
          <div className="flex items-end justify-between pt-1 border-t border-border/30">
            <div className="text-xs text-muted-foreground">{t('order.total')}</div>
            <p className="text-sm font-semibold text-foreground">
              {order.pricingCurrency
                ? formatCurrencyPrice(order.pricingAmount || order.total, order.pricingCurrency)
                : order.pricingAmount || order.total}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between">
          <div className="text-xs text-muted-foreground">{t('order.total')}</div>
          <p className="text-sm font-semibold text-foreground">
            {order.pricingCurrency
              ? formatCurrencyPrice(order.pricingAmount || order.total, order.pricingCurrency)
              : order.pricingAmount || order.total}
          </p>
        </div>
      )}
    </div>
  );
});
