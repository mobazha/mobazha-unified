'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components';
import { Container, VStack, HStack, Card, Button, Avatar } from '@mobazha/ui';
import type { Order } from '@/components/Order';

// Mock order data - in real app, fetch by ID
const mockOrder: Order & {
  shippingAddress: string;
  paymentTx: string;
  escrowTx: string;
  notes?: string;
  timeline: Array<{
    status: string;
    timestamp: string;
    description: string;
  }>;
} = {
  id: '1',
  orderId: 'MOB-2024-0001',
  status: 'shipped',
  items: [
    {
      id: 'item1',
      title: 'Premium Wireless Headphones',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
      quantity: 1,
      price: '0.015',
      currency: 'BTC',
    },
  ],
  total: '0.015',
  currency: 'BTC',
  createdAt: '2024-01-20T10:30:00',
  vendor: {
    id: 'vendor1',
    name: 'TechGear Store',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  },
  trackingNumber: 'TG123456789',
  shippingAddress: '1234 Main Street, Apt 5B\nNew York, NY 10001\nUnited States',
  paymentTx: 'a1b2c3d4e5f6g7h8i9j0...',
  escrowTx: 'k1l2m3n4o5p6q7r8s9t0...',
  notes: 'Please handle with care',
  timeline: [
    {
      status: 'created',
      timestamp: '2024-01-20T10:30:00',
      description: 'Order placed',
    },
    {
      status: 'paid',
      timestamp: '2024-01-20T10:32:00',
      description: 'Payment confirmed (6 confirmations)',
    },
    {
      status: 'processing',
      timestamp: '2024-01-20T11:00:00',
      description: 'Vendor is preparing your order',
    },
    {
      status: 'shipped',
      timestamp: '2024-01-21T14:30:00',
      description: 'Package shipped - Tracking: TG123456789',
    },
  ],
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  paid: 'bg-blue-500',
  processing: 'bg-blue-500',
  shipped: 'bg-purple-500',
  delivered: 'bg-emerald-500',
  completed: 'bg-emerald-500',
  disputed: 'bg-red-500',
  created: 'bg-slate-400',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _orderId = params.orderId as string; // Will be used for API call

  // In real app, fetch order by ID using _orderId
  const order = mockOrder;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <Container className="py-8">
          <Card variant="elevated" className="py-16 text-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Order not found
            </h2>
            <p className="text-slate-500 mb-4">
              The order you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push('/orders')}>Back to Orders</Button>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container>
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Orders
          </button>

          {/* Order Header */}
          <Card variant="elevated" className="mb-6">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <HStack justify="between" align="start" className="flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                    Order #{order.orderId}
                  </h1>
                  <p className="text-slate-500">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <HStack gap="sm">
                  <Button variant="outline">
                    <svg
                      className="w-4 h-4 mr-2"
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
                    Contact Seller
                  </Button>
                  {order.status === 'delivered' && <Button>Confirm Receipt</Button>}
                </HStack>
              </HStack>
            </div>

            {/* Order Timeline */}
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Order Timeline
              </h2>
              <div className="relative">
                {order.timeline.map((event, index) => (
                  <div key={index} className="flex gap-4 mb-6 last:mb-0">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-4 h-4 rounded-full ${statusColors[event.status] || 'bg-slate-400'}`}
                      />
                      {index < order.timeline.length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {event.description}
                      </p>
                      <p className="text-sm text-slate-500">{formatDate(event.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Items */}
            <div className="lg:col-span-2">
              <Card variant="elevated">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Order Items
                  </h2>
                </div>
                <div className="p-6">
                  <VStack gap="lg">
                    {order.items.map(item => (
                      <HStack key={item.id} gap="lg" align="start">
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <VStack gap="sm" className="flex-1">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {item.title}
                          </h3>
                          <p className="text-sm text-slate-500">Quantity: {item.quantity}</p>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {item.price} {item.currency}
                          </p>
                        </VStack>
                      </HStack>
                    ))}
                  </VStack>

                  {/* Order Summary */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <HStack justify="between" className="mb-2">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="text-slate-900 dark:text-white">
                        {order.total} {order.currency}
                      </span>
                    </HStack>
                    <HStack justify="between" className="mb-2">
                      <span className="text-slate-500">Shipping</span>
                      <span className="text-slate-900 dark:text-white">Free</span>
                    </HStack>
                    <HStack
                      justify="between"
                      className="pt-4 border-t border-slate-200 dark:border-slate-700"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                      <span className="text-xl font-bold text-emerald-600">
                        {order.total} {order.currency}
                      </span>
                    </HStack>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Seller Info */}
              <Card variant="elevated">
                <div className="p-6">
                  <h3 className="text-sm font-medium text-slate-500 mb-4">Seller</h3>
                  <HStack gap="md" align="center">
                    <Avatar src={order.vendor.avatar} name={order.vendor.name} size="lg" />
                    <VStack gap="none">
                      <Link
                        href={`/store/${order.vendor.id}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-emerald-600"
                      >
                        {order.vendor.name}
                      </Link>
                      <span className="text-sm text-slate-500">View Store</span>
                    </VStack>
                  </HStack>
                </div>
              </Card>

              {/* Shipping Info */}
              <Card variant="elevated">
                <div className="p-6">
                  <h3 className="text-sm font-medium text-slate-500 mb-4">Shipping Address</h3>
                  <p className="text-slate-900 dark:text-white whitespace-pre-line">
                    {order.shippingAddress}
                  </p>
                  {order.trackingNumber && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Tracking Number</h3>
                      <p className="font-mono font-medium text-emerald-600">
                        {order.trackingNumber}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Payment Info */}
              <Card variant="elevated">
                <div className="p-6">
                  <h3 className="text-sm font-medium text-slate-500 mb-4">Payment Details</h3>
                  <VStack gap="md">
                    <div>
                      <span className="text-xs text-slate-500">Payment Transaction</span>
                      <p className="font-mono text-sm text-slate-900 dark:text-white truncate">
                        {order.paymentTx}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Escrow Transaction</span>
                      <p className="font-mono text-sm text-slate-900 dark:text-white truncate">
                        {order.escrowTx}
                      </p>
                    </div>
                  </VStack>
                </div>
              </Card>

              {/* Order Notes */}
              {order.notes && (
                <Card variant="elevated">
                  <div className="p-6">
                    <h3 className="text-sm font-medium text-slate-500 mb-4">Order Notes</h3>
                    <p className="text-slate-900 dark:text-white">{order.notes}</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
