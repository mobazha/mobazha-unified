'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { VStack, HStack } from '@/components/layouts';
import {
  useI18n,
  useCurrency,
  getOrderStatusInfo,
  getOrderStatusColor,
  type OrderState,
} from '@mobazha/core';
import { formatOrderDate } from './utils';

export interface OrderSummaryProps {
  orderId: string;
  state: OrderState;
  createdAt: string;
  subtotal: string;
  shipping?: string;
  moderatorFee?: string;
  total: string;
  currency: string;
  paymentCoin?: string;
  quantity: number;
  className?: string;
}

/**
 * 订单摘要组件
 * 显示订单基本信息和价格明细
 */
export const OrderSummary: React.FC<OrderSummaryProps> = ({
  orderId,
  state,
  createdAt,
  subtotal,
  shipping,
  moderatorFee,
  total,
  currency,
  paymentCoin,
  quantity,
  className = '',
}) => {
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const statusInfo = getOrderStatusInfo(state);
  const statusColors = getOrderStatusColor(state);

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      {/* Order Header */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t('order.orderNumber')}</p>
          <p className="font-mono font-medium text-foreground">#{orderId.slice(0, 12)}...</p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}
        >
          {statusInfo.label}
        </div>
      </div>

      {/* Order Info */}
      <VStack gap="sm" className="mb-4 pb-4 border-b border-border">
        <HStack justify="between">
          <span className="text-sm text-muted-foreground">{t('order.date')}</span>
          <span className="text-sm text-foreground">{formatOrderDate(createdAt)}</span>
        </HStack>
        <HStack justify="between">
          <span className="text-sm text-muted-foreground">{t('order.items')}</span>
          <span className="text-sm text-foreground">
            {quantity} {t('product.quantity')}
          </span>
        </HStack>
        {paymentCoin && (
          <HStack justify="between">
            <span className="text-sm text-muted-foreground">{t('checkout.paymentMethod')}</span>
            <span className="text-sm text-foreground font-medium">{paymentCoin}</span>
          </HStack>
        )}
      </VStack>

      {/* Price Breakdown */}
      <VStack gap="sm" className="mb-4">
        <HStack justify="between">
          <span className="text-sm text-muted-foreground">{t('order.subtotal')}</span>
          <span className="text-sm text-foreground">{formatCurrencyPrice(subtotal, currency)}</span>
        </HStack>
        <HStack justify="between">
          <span className="text-sm text-muted-foreground">{t('order.shipping')}</span>
          <span className="text-sm text-foreground">
            {shipping === '0' || !shipping
              ? t('order.free')
              : formatCurrencyPrice(shipping, currency)}
          </span>
        </HStack>
        {moderatorFee && moderatorFee !== '0' && (
          <HStack justify="between">
            <span className="text-sm text-muted-foreground">{t('order.moderatorFee')}</span>
            <span className="text-sm text-foreground">
              {formatCurrencyPrice(moderatorFee, currency)}
            </span>
          </HStack>
        )}
      </VStack>

      {/* Total */}
      <div className="pt-4 border-t border-border">
        <HStack justify="between" align="center">
          <span className="text-base font-medium text-foreground">{t('order.total')}</span>
          <span className="text-xl font-bold text-foreground">
            {formatCurrencyPrice(total, currency)}
          </span>
        </HStack>
      </div>
    </Card>
  );
};

export default OrderSummary;
