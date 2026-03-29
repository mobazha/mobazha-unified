'use client';

import React from 'react';
import Link from 'next/link';
import { HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { ProductImage } from '@/components/ui/product-image';
import { useCurrency, useI18n } from '@mobazha/core';
import { CreditCard } from 'lucide-react';
import { isFiatPendingConfirmation } from '@/lib/fiatPending';

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
  /** 支付币种（用于判断是否需要链上交易） */
  paymentCoin?: string;
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  awaiting_payment: {
    label: 'Awaiting Payment',
    color: 'bg-warning/15 text-warning',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  pending: {
    label: 'Pending',
    color: 'bg-warning/15 text-warning',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  processing: {
    label: 'Processing',
    color: 'bg-info/15 text-info',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  },
  shipped: {
    label: 'Shipped',
    color: 'bg-primary/15 text-primary',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </svg>
    ),
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-success/15 text-success',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  disputed: {
    label: 'Disputed',
    color: 'bg-error/15 text-error',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  completed: {
    label: 'Completed',
    color: 'bg-success/15 text-success',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-muted text-muted-foreground',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
  },
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, type, onViewDetails, onContact }) => {
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const { t } = useI18n();
  const status = statusConfig[order.status];
  const isAwaitingPaymentRaw = type === 'purchase' && order.rawState === 'AWAITING_PAYMENT';
  const hasPendingFiatConfirmation =
    isAwaitingPaymentRaw && isFiatPendingConfirmation(order.orderId);
  const isAwaitingPayment = isAwaitingPaymentRaw && !hasPendingFiatConfirmation;

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
              {status.icon}
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
