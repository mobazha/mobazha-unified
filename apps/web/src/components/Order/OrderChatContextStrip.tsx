'use client';

import React from 'react';
import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency, useI18n, type DisplayOrder } from '@mobazha/core';
import { getStatusLabel } from '@/components/Order/cards/orderProgressUtils';

export interface OrderChatContextStripProps {
  displayOrder: DisplayOrder;
  onBackToSummary: () => void;
  className?: string;
  compact?: boolean;
}

export function OrderChatContextStrip({
  displayOrder,
  onBackToSummary,
  className = '',
  compact = false,
}: OrderChatContextStripProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const primaryItem = displayOrder.items?.[0];
  const statusLabel = getStatusLabel(displayOrder.status, t);
  const formattedTotal =
    displayOrder.pricingAmount && displayOrder.pricingCurrency
      ? formatPrice(displayOrder.pricingAmount, displayOrder.pricingCurrency)
      : null;

  if (compact) {
    return (
      <div
        className={`mx-4 mt-3 mb-2 rounded-xl border border-border/60 bg-card/90 px-3 py-2.5 ${className}`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToSummary}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
            aria-label={t('order.chat.backToSummary')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              {primaryItem?.title || displayOrder.orderId}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {statusLabel}
              {formattedTotal ? ` · ${formattedTotal}` : ''}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex flex-col h-full bg-muted/20 ${className}`}>
      <div className="p-4 border-b border-border/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBackToSummary}
          className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('order.chat.backToSummary')}
        </Button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
              {primaryItem?.image ? (
                <img
                  src={primaryItem.image}
                  alt={primaryItem.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-7 h-7 text-muted-foreground/60" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground line-clamp-2">
                {primaryItem?.title || t('order.orderIdLabel')}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                {t('order.chat.orderNumber', {
                  orderId:
                    displayOrder.orderId.length > 12
                      ? `${displayOrder.orderId.slice(0, 8)}…`
                      : displayOrder.orderId,
                })}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t('order.status')}</span>
              <span className="text-xs font-semibold text-foreground">{statusLabel}</span>
            </div>
            {formattedTotal && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t('order.total')}</span>
                <span className="text-xs font-semibold text-foreground">{formattedTotal}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed px-1">
          {t('order.chat.contextHint')}
        </p>
        <p className="text-xs text-muted-foreground/80 leading-relaxed px-1">
          {t('order.chat.panelsHint')}
        </p>
      </div>
    </div>
  );
}

export default OrderChatContextStrip;
