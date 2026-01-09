'use client';

import React from 'react';
import { useI18n, useCurrency } from '@mobazha/core';
import { Card, CardContent } from '@/components/ui/card';
import { HStack, VStack } from '@/components/layouts';
import { cn } from '@/lib/utils';

export interface OrderSummaryItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  image: string;
}

export interface OrderSummaryAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface OrderSummaryCardProps {
  orderID: string;
  items: OrderSummaryItem[];
  vendor: {
    name: string;
    peerID: string;
  };
  shippingAddress: OrderSummaryAddress;
  memo?: string;
  className?: string;
}

/**
 * 订单摘要卡片组件
 * 在支付页面显示订单的只读信息
 */
export function OrderSummaryCard({
  orderID,
  items,
  vendor,
  shippingAddress,
  memo,
  className,
}: OrderSummaryCardProps) {
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();

  return (
    <Card className={cn(className)}>
      <CardContent className="p-4 sm:p-6">
        {/* Header */}
        <HStack justify="between" align="center" className="mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            {t('order.orderSummary')}
          </h2>
          <span className="text-xs sm:text-sm text-muted-foreground font-mono">
            #{orderID.slice(0, 12)}...
          </span>
        </HStack>

        {/* Items */}
        <VStack gap="sm" className="mb-4 pb-4 border-b border-border">
          {items.map(item => (
            <HStack key={item.id} gap="sm" align="start">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('order.quantity')}: {item.quantity}
                </p>
              </div>
              <p className="font-medium text-foreground text-sm">
                {renderPairedPrice(item.price * item.quantity, item.currency)}
              </p>
            </HStack>
          ))}
        </VStack>

        {/* Vendor */}
        <div className="mb-4 pb-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-1">{t('order.seller')}</p>
          <p className="text-sm font-medium text-foreground">{vendor.name}</p>
        </div>

        {/* Shipping Address */}
        <div className="mb-4 pb-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-1">{t('order.shippingAddress')}</p>
          <div className="text-sm text-foreground">
            <p className="font-medium">{shippingAddress.name}</p>
            <p className="text-muted-foreground">{shippingAddress.street}</p>
            <p className="text-muted-foreground">
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
            </p>
            <p className="text-muted-foreground">{shippingAddress.country}</p>
          </div>
        </div>

        {/* Memo */}
        {memo && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('order.orderNote')}</p>
            <p className="text-sm text-foreground bg-muted/50 rounded-md p-2.5">{memo}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderSummaryCard;
