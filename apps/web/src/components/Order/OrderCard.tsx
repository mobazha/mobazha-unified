'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useCurrency } from '@mobazha/core';

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

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/20 text-yellow-600',
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
    color: 'bg-blue-500/20 text-blue-600',
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
    color: 'bg-purple-500/20 text-purple-600',
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
    color: 'bg-primary/20 text-primary',
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
    color: 'bg-red-500/20 text-red-600',
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
    color: 'bg-primary/20 text-primary',
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
  const status = statusConfig[order.status];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="overflow-hidden active:scale-[0.995] transition-transform">
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
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${status.color}`}
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
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {type === 'purchase' ? 'Seller' : 'Buyer'}
            </span>
            <Link
              href={`/store/${order.vendor.id}`}
              className="font-medium text-sm sm:text-base text-foreground hover:text-primary"
            >
              {order.vendor.name}
            </Link>
          </VStack>
        </HStack>

        {/* Items */}
        <VStack gap="sm" className="mb-3 sm:mb-4 sm:gap-4">
          {order.items.slice(0, 2).map(item => (
            <HStack key={item.id} gap="sm" align="center" className="sm:gap-4">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 48px, 64px"
                  className="object-cover"
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
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-purple-500/10 rounded-lg">
            <span className="text-[10px] sm:text-xs text-purple-600">Tracking Number</span>
            <p className="font-mono font-medium text-sm sm:text-base text-foreground">
              {order.trackingNumber}
            </p>
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
