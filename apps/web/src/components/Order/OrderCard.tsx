'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { ProductImage } from '@/components/ui/product-image';
import { useCurrency, useI18n } from '@mobazha/core';
import { CreditCard } from 'lucide-react';
import { getStandardStatusConfig, resolveStatusDisplay } from './orderStatusConfig';

export interface OrderItem {
  id: string;
  title: string;
  image: string;
  quantity: number;
  price: string;
  currency: string;
}

export interface Order {
  id: string;
  orderId: string;
  status:
    | 'awaiting_payment'
    | 'pending'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'disputed'
    | 'completed'
    | 'cancelled';
  /** 原始订单状态（用于判断是否显示特定操作按钮） */
  rawState?: string;
  /** Moderated buyer-protection order */
  isModerated?: boolean;
  /** settlementSpec.escrowType (managed_escrow / utxo_script / solana_escrow) */
  paymentEscrowType?: string;
  /** 支付币种（用于判断是否需要链上交易） */
  paymentCoin?: string;
  /** 最新结算动作类型（backend settlement / settlement projection） */
  settlementAction?: string;
  /** 最新结算动作 ID */
  settlementActionId?: string;
  /** 最新结算动作状态 */
  settlementState?: string;
  /** 最新结算动作链上交易哈希 */
  settlementTxHash?: string;
  items: OrderItem[];
  total: string;
  currency: string;
  createdAt: string;
  vendor: {
    id: string;
    name: string;
    avatar?: string;
  };
  trackingNumber?: string;
  shippingAddress?: string;
}

export interface OrderCardProps {
  order: Order;
  type: 'purchase' | 'sale';
  onViewDetails?: () => void;
  onContact?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, type, onViewDetails, onContact }) => {
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const { t } = useI18n();
  const statusCfg = useMemo(() => getStandardStatusConfig(t), [t]);
  const status = resolveStatusDisplay(order.status, statusCfg);
  const isAwaitingPayment = type === 'purchase' && order.rawState === 'AWAITING_PAYMENT';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card
      className="overflow-hidden active:scale-[0.995] transition-transform"
      data-testid="order-card"
    >
      {/* Header */}
      <div className="p-3 sm:p-4 bg-muted/50 border-b border-border">
        <HStack justify="between" align="center" className="flex-wrap gap-2">
          <HStack gap="sm" align="center" className="sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground">Order</span>
            <span className="font-mono font-medium text-xs sm:text-sm text-foreground">
              #{order.orderId}
            </span>
          </HStack>

          <HStack gap="sm" align="center" className="sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {formatDate(order.createdAt)}
            </span>
            <span
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${status.color}`}
            >
              {status.icon && React.createElement(status.icon, { className: 'w-3.5 h-3.5' })}
              {status.label}
            </span>
          </HStack>
        </HStack>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* Vendor/Buyer */}
        <HStack gap="sm" align="center" className="mb-3 sm:mb-4 sm:gap-4">
          <Avatar
            src={order.vendor.avatar}
            name={order.vendor.name}
            size="xs"
            className="w-8 h-8 sm:w-9 sm:h-9"
          />
          <VStack gap="none">
            <span className="text-xs text-muted-foreground">
              {type === 'purchase' ? 'Seller' : 'Buyer'}
            </span>
            <Link
              href={`/store/${order.vendor.id}`}
              className="font-medium text-sm sm:text-base text-foreground hover:text-primary"
              data-testid="order-card-peer-link"
            >
              {order.vendor.name}
            </Link>
          </VStack>
        </HStack>

        {/* Items */}
        <VStack gap="sm" className="mb-3 sm:mb-4 sm:gap-4">
          {order.items.slice(0, 2).map(item => (
            <HStack key={item.id} gap="sm" align="center" className="sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0">
                <ProductImage
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 48px, 64px"
                  iconSize="sm"
                />
              </div>
              <VStack gap="none" className="flex-1 min-w-0">
                <span className="font-medium text-sm sm:text-base text-foreground truncate">
                  {item.title}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Qty: {item.quantity} × {item.price} {item.currency}
                </span>
              </VStack>
            </HStack>
          ))}
          {order.items.length > 2 && (
            <span className="text-xs sm:text-sm text-muted-foreground">
              +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
            </span>
          )}
        </VStack>

        {/* Tracking */}
        {order.trackingNumber && order.status === 'shipped' && (
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-primary/10 rounded-lg">
            <span className="text-xs text-primary">Tracking Number</span>
            <p className="font-mono font-medium text-sm sm:text-base text-foreground">
              {order.trackingNumber}
            </p>
          </div>
        )}

        {/* Continue Payment Banner */}
        {isAwaitingPayment && (
          <div className="mb-3 sm:mb-4">
            <Link href={`/payment?orderID=${order.orderId}`} className="block">
              <Button
                className="w-full pointer-events-none"
                size="sm"
                tabIndex={-1}
                data-testid="order-card-continue-payment"
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                {t('payment.payNow')}
              </Button>
            </Link>
          </div>
        )}

        {/* Total & Actions */}
        <div className="pt-3 sm:pt-4 border-t border-border">
          <HStack justify="between" align="center">
            <VStack gap="none">
              <span className="text-xs sm:text-sm text-muted-foreground">Total</span>
              <span className="text-lg sm:text-xl font-bold text-foreground">
                {formatCurrencyPrice(order.total, order.currency || 'USD')}
              </span>
            </VStack>

            <HStack gap="xs" className="flex-shrink-0 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onContact}
                className="whitespace-nowrap text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                data-testid="order-card-contact"
              >
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span className="hidden sm:inline">Contact</span>
              </Button>
              <Button
                size="sm"
                onClick={onViewDetails}
                className="whitespace-nowrap text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
                data-testid="order-card-details"
              >
                Details
              </Button>
            </HStack>
          </HStack>
        </div>
      </div>
    </Card>
  );
};
