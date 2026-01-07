'use client';

import React from 'react';
import Link from 'next/link';
import { HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';

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
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
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
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
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
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
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
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
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
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
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
  const status = statusConfig[order.status];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <HStack justify="between" align="center" className="flex-wrap gap-2">
          <HStack gap="md" align="center">
            <span className="text-sm text-slate-500">Order</span>
            <span className="font-mono font-medium text-slate-900 dark:text-white">
              #{order.orderId}
            </span>
          </HStack>

          <HStack gap="md" align="center">
            <span className="text-sm text-slate-500">{formatDate(order.createdAt)}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
            >
              {status.icon}
              {status.label}
            </span>
          </HStack>
        </HStack>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Vendor/Buyer */}
        <HStack gap="md" align="center" className="mb-4">
          <Avatar src={order.vendor.avatar} name={order.vendor.name} size="sm" />
          <VStack gap="none">
            <span className="text-xs text-slate-500">
              {type === 'purchase' ? 'Seller' : 'Buyer'}
            </span>
            <Link
              href={`/store/${order.vendor.id}`}
              className="font-medium text-slate-900 dark:text-white hover:text-emerald-600"
            >
              {order.vendor.name}
            </Link>
          </VStack>
        </HStack>

        {/* Items */}
        <VStack gap="md" className="mb-4">
          {order.items.slice(0, 2).map(item => (
            <HStack key={item.id} gap="md" align="center">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <VStack gap="none" className="flex-1 min-w-0">
                <span className="font-medium text-slate-900 dark:text-white truncate">
                  {item.title}
                </span>
                <span className="text-sm text-slate-500">
                  Qty: {item.quantity} × {item.price} {item.currency}
                </span>
              </VStack>
            </HStack>
          ))}
          {order.items.length > 2 && (
            <span className="text-sm text-slate-500">
              +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
            </span>
          )}
        </VStack>

        {/* Tracking */}
        {order.trackingNumber && order.status === 'shipped' && (
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <span className="text-xs text-purple-600 dark:text-purple-400">Tracking Number</span>
            <p className="font-mono font-medium text-purple-900 dark:text-purple-200">
              {order.trackingNumber}
            </p>
          </div>
        )}

        {/* Total & Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <HStack justify="between" align="center">
            <VStack gap="none">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {order.total} {order.currency}
              </span>
            </VStack>

            <HStack gap="sm" className="flex-shrink-0">
              <Button variant="outline" size="sm" onClick={onContact} className="whitespace-nowrap">
                <svg
                  className="w-4 h-4 mr-1 flex-shrink-0"
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
                Contact
              </Button>
              <Button size="sm" onClick={onViewDetails} className="whitespace-nowrap">
                Details
              </Button>
            </HStack>
          </HStack>
        </div>
      </div>
    </Card>
  );
};
