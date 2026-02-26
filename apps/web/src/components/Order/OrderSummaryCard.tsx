'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n, useCurrency } from '@mobazha/core';
import { Card, CardContent } from '@/components/ui/card';
import { HStack, VStack } from '@/components/layouts';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { ProductImageNative } from '@/components/ui/product-image';
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

export interface OrderSummaryVendor {
  name: string;
  peerID: string;
  avatar?: string;
}

export interface OrderSummaryCardProps {
  orderID: string;
  items: OrderSummaryItem[];
  vendor: OrderSummaryVendor;
  shippingAddress?: OrderSummaryAddress;
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
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0">
                <ProductImageNative src={item.image} alt={item.title ?? ''} iconSize="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('order.quantity')}: {item.quantity}
                </p>
              </div>
              <p className="font-medium text-foreground text-sm">
                {renderPairedPrice(item.price * item.quantity, item.currency, {
                  isMinimalUnit: false,
                })}
              </p>
            </HStack>
          ))}
        </VStack>

        {/* Vendor */}
        <div className="mb-4 pb-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">{t('order.seller')}</p>
          <Link
            href={vendor.peerID ? `/store/${vendor.peerID}` : '#'}
            className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors"
          >
            <Avatar src={vendor.avatar} name={vendor.name} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{vendor.name}</p>
              {vendor.peerID && (
                <p className="text-xs text-muted-foreground truncate">
                  {vendor.peerID.slice(0, 16)}...
                </p>
              )}
            </div>
          </Link>
        </div>

        {/* Shipping Address - 仅当有实际地址内容时显示 */}
        {shippingAddress && shippingAddress.street && (
          <div className="mb-4 pb-4 border-b border-border">
            <p className="text-xs text-muted-foreground mb-1">{t('order.shippingAddress')}</p>
            <div className="text-sm text-foreground">
              {shippingAddress.name && <p className="font-medium">{shippingAddress.name}</p>}
              {shippingAddress.street && (
                <p className="text-muted-foreground">{shippingAddress.street}</p>
              )}
              {(shippingAddress.city || shippingAddress.state || shippingAddress.postalCode) && (
                <p className="text-muted-foreground">
                  {[shippingAddress.city, shippingAddress.state, shippingAddress.postalCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {shippingAddress.country && (
                <p className="text-muted-foreground">{shippingAddress.country}</p>
              )}
            </div>
          </div>
        )}

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
