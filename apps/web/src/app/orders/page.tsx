'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components';
import { Container, VStack, HStack, Skeleton, Card } from '@mobazha/ui';
import { OrderCard, Order } from '@/components/Order';

type OrderStatus =
  | 'all'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'disputed';
type OrderType = 'purchases' | 'sales';

// Mock orders data
const mockOrders: Order[] = [
  {
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
  },
  {
    id: '2',
    orderId: 'MOB-2024-0002',
    status: 'processing',
    items: [
      {
        id: 'item2',
        title: 'Handcrafted Leather Wallet',
        image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=200&h=200&fit=crop',
        quantity: 1,
        price: '0.008',
        currency: 'BTC',
      },
      {
        id: 'item3',
        title: 'Leather Belt',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop',
        quantity: 1,
        price: '0.005',
        currency: 'BTC',
      },
    ],
    total: '0.013',
    currency: 'BTC',
    createdAt: '2024-01-19T14:20:00',
    vendor: {
      id: 'vendor2',
      name: 'LeatherCraft',
    },
  },
  {
    id: '3',
    orderId: 'MOB-2024-0003',
    status: 'completed',
    items: [
      {
        id: 'item4',
        title: 'Smart Contract Audit Service',
        image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&h=200&fit=crop',
        quantity: 1,
        price: '0.5',
        currency: 'ETH',
      },
    ],
    total: '0.5',
    currency: 'ETH',
    createdAt: '2024-01-15T09:00:00',
    vendor: {
      id: 'vendor3',
      name: 'DevPro Services',
    },
  },
  {
    id: '4',
    orderId: 'MOB-2024-0004',
    status: 'pending',
    items: [
      {
        id: 'item5',
        title: 'Mechanical Keyboard RGB',
        image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=200&h=200&fit=crop',
        quantity: 1,
        price: '0.012',
        currency: 'BTC',
      },
    ],
    total: '0.012',
    currency: 'BTC',
    createdAt: '2024-01-21T16:45:00',
    vendor: {
      id: 'vendor4',
      name: 'GamerZone',
    },
  },
];

const statusTabs: { value: OrderStatus; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'completed', label: 'Completed' },
  { value: 'disputed', label: 'Disputed' },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType>('purchases');
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [isLoading] = useState(false);

  const filteredOrders = mockOrders.filter(
    order => statusFilter === 'all' || order.status === statusFilter
  );

  const handleViewDetails = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handleContact = (vendorId: string) => {
    // Navigate to chat with vendor
    router.push(`/chat/${vendorId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container>
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Orders</h1>
            <p className="text-slate-500">Manage your purchases and sales</p>
          </div>

          {/* Order Type Toggle */}
          <div className="mb-6">
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {(['purchases', 'sales'] as OrderType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    orderType === type
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {type === 'purchases' ? 'My Purchases' : 'My Sales'}
                </button>
              ))}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="mb-6 overflow-x-auto">
            <HStack gap="sm" className="min-w-max pb-2">
              {statusTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </HStack>
          </div>

          {/* Orders List */}
          {isLoading ? (
            <VStack gap="lg">
              {[...Array(3)].map((_, i) => (
                <Card key={i} variant="elevated" className="p-6">
                  <HStack gap="md" align="start" className="mb-4">
                    <Skeleton variant="rectangular" width={64} height={64} className="rounded-lg" />
                    <div className="flex-1">
                      <Skeleton variant="text" width="60%" height={20} />
                      <Skeleton variant="text" width="40%" height={16} className="mt-2" />
                    </div>
                    <Skeleton variant="rounded" width={100} height={28} />
                  </HStack>
                  <HStack justify="between" align="center">
                    <Skeleton variant="text" width={120} height={24} />
                    <HStack gap="sm">
                      <Skeleton variant="rounded" width={80} height={36} />
                      <Skeleton variant="rounded" width={100} height={36} />
                    </HStack>
                  </HStack>
                </Card>
              ))}
            </VStack>
          ) : filteredOrders.length === 0 ? (
            <Card variant="elevated" className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No orders found
              </h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                {statusFilter === 'all'
                  ? `You don't have any ${orderType} yet. Start exploring the marketplace!`
                  : `No ${statusFilter} orders at the moment.`}
              </p>
            </Card>
          ) : (
            <VStack gap="lg">
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  type={orderType === 'purchases' ? 'purchase' : 'sale'}
                  onViewDetails={() => handleViewDetails(order.id)}
                  onContact={() => handleContact(order.vendor.id)}
                />
              ))}
            </VStack>
          )}
        </Container>
      </main>
    </div>
  );
}
