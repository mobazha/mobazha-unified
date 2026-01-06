'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack, Card, Button, Avatar } from '@mobazha/ui';

// Types
interface OrderItem {
  id: string;
  title: string;
  image: string;
  quantity: number;
  price: string;
  currency: string;
}

interface OrderVendor {
  id: string;
  name: string;
  avatar: string;
  peerID?: string;
}

interface Moderator {
  id: string;
  name: string;
  avatar: string;
  fee: number;
}

interface TimelineEvent {
  status: string;
  timestamp: string;
  description: string;
  actor?: 'buyer' | 'seller' | 'moderator' | 'system';
}

interface Order {
  id: string;
  orderId: string;
  status:
    | 'pending'
    | 'awaiting_payment'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'disputed'
    | 'refunded'
    | 'cancelled'
    | 'split_resolved';
  items: OrderItem[];
  total: string;
  currency: string;
  createdAt: string;
  vendor: OrderVendor;
  buyer?: OrderVendor;
  moderator?: Moderator;
  trackingNumber?: string;
  shippingAddress: string;
  paymentTx?: string;
  escrowTx?: string;
  escrowAddress?: string;
  chainId?: number;
  notes?: string;
  timeline: TimelineEvent[];
  userRole: 'buyer' | 'seller' | 'moderator';
  dispute?: {
    id: string;
    claim: string;
    response?: string;
    status: 'open' | 'in_progress' | 'resolved';
    initiator: 'buyer' | 'seller';
    resolution?: 'buyer' | 'seller' | 'split';
  };
}

// Mock order data
const mockOrder: Order = {
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
      currency: 'ETH',
    },
  ],
  total: '0.015',
  currency: 'ETH',
  createdAt: '2024-01-20T10:30:00',
  vendor: {
    id: 'vendor1',
    name: 'TechGear Store',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  },
  buyer: {
    id: 'buyer1',
    name: 'John Buyer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=buyer1',
  },
  moderator: {
    id: 'mod1',
    name: 'TrustGuard',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=trustguard',
    fee: 1,
  },
  trackingNumber: 'TG123456789',
  shippingAddress: '1234 Main Street, Apt 5B\nNew York, NY 10001\nUnited States',
  paymentTx: '0xa1b2c3d4e5f6...',
  escrowTx: '0xk1l2m3n4o5p6...',
  escrowAddress: '0x1234...5678',
  chainId: 1,
  notes: 'Please handle with care',
  timeline: [
    {
      status: 'created',
      timestamp: '2024-01-20T10:30:00',
      description: 'Order placed',
      actor: 'buyer',
    },
    {
      status: 'paid',
      timestamp: '2024-01-20T10:32:00',
      description: 'Payment confirmed (12 confirmations)',
      actor: 'system',
    },
    {
      status: 'processing',
      timestamp: '2024-01-20T11:00:00',
      description: 'Vendor is preparing your order',
      actor: 'seller',
    },
    {
      status: 'shipped',
      timestamp: '2024-01-21T14:30:00',
      description: 'Package shipped - Tracking: TG123456789',
      actor: 'seller',
    },
  ],
  userRole: 'buyer', // This would be determined by authentication
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  awaiting_payment: 'bg-yellow-500',
  paid: 'bg-blue-500',
  processing: 'bg-blue-500',
  shipped: 'bg-purple-500',
  delivered: 'bg-emerald-500',
  completed: 'bg-emerald-500',
  disputed: 'bg-red-500',
  refunded: 'bg-orange-500',
  cancelled: 'bg-slate-500',
  created: 'bg-slate-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  awaiting_payment: 'Awaiting Payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  // orderId is available from params
  void orderId;

  const [order, setOrder] = useState<Order>(mockOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [trackingInfo, setTrackingInfo] = useState({ carrier: '', trackingNumber: '' });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Action handlers
  const handleConfirmReceipt = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Call escrow service to release funds
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOrder(prev => ({
        ...prev,
        status: 'completed',
        timeline: [
          ...prev.timeline,
          {
            status: 'completed',
            timestamp: new Date().toISOString(),
            description: 'Order completed - Funds released to seller',
            actor: 'buyer',
          },
        ],
      }));
      alert('Order completed successfully! Funds have been released to the seller.');
    } catch (error) {
      alert('Failed to confirm receipt: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenDispute = useCallback(async () => {
    if (!disputeReason.trim()) {
      alert('Please provide a reason for the dispute');
      return;
    }
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOrder(prev => ({
        ...prev,
        status: 'disputed',
        dispute: {
          id: 'dispute-' + Date.now(),
          claim: disputeReason,
          status: 'open',
          initiator: 'buyer',
        },
        timeline: [
          ...prev.timeline,
          {
            status: 'disputed',
            timestamp: new Date().toISOString(),
            description: 'Dispute opened by buyer',
            actor: 'buyer',
          },
        ],
      }));
      setShowDisputeModal(false);
      setDisputeReason('');
      alert('Dispute has been opened. The moderator will review your case.');
    } catch (error) {
      alert('Failed to open dispute: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [disputeReason]);

  const handleShipOrder = useCallback(async () => {
    if (!trackingInfo.trackingNumber.trim()) {
      alert('Please provide tracking information');
      return;
    }
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOrder(prev => ({
        ...prev,
        status: 'shipped',
        trackingNumber: trackingInfo.trackingNumber,
        timeline: [
          ...prev.timeline,
          {
            status: 'shipped',
            timestamp: new Date().toISOString(),
            description: `Package shipped - ${trackingInfo.carrier}: ${trackingInfo.trackingNumber}`,
            actor: 'seller',
          },
        ],
      }));
      setShowShipModal(false);
      setTrackingInfo({ carrier: '', trackingNumber: '' });
      alert('Order marked as shipped!');
    } catch (error) {
      alert('Failed to update shipping: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [trackingInfo]);

  const handleRefund = useCallback(async () => {
    if (!confirm('Are you sure you want to refund this order?')) return;
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOrder(prev => ({
        ...prev,
        status: 'refunded',
        timeline: [
          ...prev.timeline,
          {
            status: 'refunded',
            timestamp: new Date().toISOString(),
            description: 'Order refunded by seller',
            actor: 'seller',
          },
        ],
      }));
      alert('Refund processed successfully!');
    } catch (error) {
      alert('Failed to process refund: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResolveDispute = useCallback(async (decision: 'buyer' | 'seller' | 'split') => {
    if (!confirm(`Are you sure you want to resolve this dispute in favor of ${decision}?`)) return;
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 根据决定确定订单状态和描述
      let newStatus: Order['status'];
      let description: string;

      switch (decision) {
        case 'buyer':
          newStatus = 'refunded';
          description = 'Dispute resolved: Full refund to buyer';
          break;
        case 'seller':
          newStatus = 'completed';
          description = 'Dispute resolved: Full payment to seller';
          break;
        case 'split':
          newStatus = 'split_resolved';
          description = 'Dispute resolved: Funds split between buyer and seller';
          break;
        default:
          newStatus = 'completed';
          description = `Dispute resolved in favor of ${decision}`;
      }

      setOrder(prev => ({
        ...prev,
        status: newStatus,
        dispute: prev.dispute
          ? { ...prev.dispute, status: 'resolved', resolution: decision }
          : undefined,
        timeline: [
          ...prev.timeline,
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            description,
            actor: 'moderator',
          },
        ],
      }));
      alert('Dispute has been resolved!');
    } catch (error) {
      alert('Failed to resolve dispute: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <Container className="py-8">
          <Card padding="lg" className="py-16 text-center">
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

  // Determine available actions based on status and role
  const canConfirmReceipt =
    order.userRole === 'buyer' && ['shipped', 'delivered'].includes(order.status);
  const canOpenDispute =
    order.userRole === 'buyer' &&
    ['paid', 'processing', 'shipped', 'delivered'].includes(order.status) &&
    !order.dispute;
  const canShipOrder = order.userRole === 'seller' && ['paid', 'processing'].includes(order.status);
  const canRefund =
    order.userRole === 'seller' && ['paid', 'processing', 'shipped'].includes(order.status);
  const canResolveDispute = order.userRole === 'moderator' && order.status === 'disputed';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container size="xl">
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
          <Card padding="lg" className="mb-6">
            <HStack justify="between" align="start" className="flex-wrap gap-4 mb-6">
              <div>
                <HStack gap="md" align="center" className="mb-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Order #{order.orderId}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium text-white ${statusColors[order.status]}`}
                  >
                    {statusLabels[order.status]}
                  </span>
                </HStack>
                <p className="text-slate-500">Placed on {formatDate(order.createdAt)}</p>
              </div>

              {/* Actions */}
              <HStack gap="sm" className="flex-wrap">
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
                  Message
                </Button>

                {canConfirmReceipt && (
                  <Button onClick={handleConfirmReceipt} disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Confirm Receipt'}
                  </Button>
                )}

                {canOpenDispute && (
                  <Button
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-50"
                    onClick={() => setShowDisputeModal(true)}
                  >
                    Open Dispute
                  </Button>
                )}

                {canShipOrder && (
                  <Button onClick={() => setShowShipModal(true)}>Mark as Shipped</Button>
                )}

                {canRefund && (
                  <Button variant="outline" onClick={handleRefund} disabled={isLoading}>
                    Refund Order
                  </Button>
                )}
              </HStack>
            </HStack>

            {/* Dispute Banner */}
            {order.dispute && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
                <HStack justify="between" align="start" className="flex-wrap gap-4">
                  <div>
                    <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">
                      Dispute Open
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-300">{order.dispute.claim}</p>
                    <p className="text-xs text-red-500 mt-1">
                      Initiated by {order.dispute.initiator} • Status: {order.dispute.status}
                    </p>
                  </div>
                  {canResolveDispute && (
                    <HStack gap="sm">
                      <Button size="sm" onClick={() => handleResolveDispute('buyer')}>
                        Favor Buyer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveDispute('seller')}
                      >
                        Favor Seller
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolveDispute('split')}
                      >
                        Split
                      </Button>
                    </HStack>
                  )}
                </HStack>
              </div>
            )}

            {/* Order Timeline */}
            <div>
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
                      <HStack justify="between" align="start">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {event.description}
                          </p>
                          <p className="text-sm text-slate-500">{formatDate(event.timestamp)}</p>
                        </div>
                        {event.actor && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded capitalize">
                            {event.actor}
                          </span>
                        )}
                      </HStack>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Items */}
            <div className="lg:col-span-2">
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Order Items
                </h2>
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
                        <h3 className="font-medium text-slate-900 dark:text-white">{item.title}</h3>
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
                  {order.moderator && (
                    <HStack justify="between" className="mb-2">
                      <span className="text-slate-500">Moderator Fee</span>
                      <span className="text-slate-900 dark:text-white">{order.moderator.fee}%</span>
                    </HStack>
                  )}
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
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Parties Info */}
              <Card padding="lg">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Seller</h3>
                <HStack gap="md" align="center" className="mb-4">
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

                {order.moderator && (
                  <>
                    <h3 className="text-sm font-medium text-slate-500 mb-4 mt-6">Moderator</h3>
                    <HStack gap="md" align="center">
                      <img
                        src={order.moderator.avatar}
                        alt={order.moderator.name}
                        className="w-12 h-12 rounded-full bg-slate-200"
                      />
                      <VStack gap="none">
                        <Link
                          href={`/moderators/${order.moderator.id}`}
                          className="font-semibold text-slate-900 dark:text-white hover:text-emerald-600"
                        >
                          {order.moderator.name}
                        </Link>
                        <span className="text-sm text-slate-500">{order.moderator.fee}% fee</span>
                      </VStack>
                    </HStack>
                  </>
                )}
              </Card>

              {/* Shipping Info */}
              <Card padding="lg">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Shipping Address</h3>
                <p className="text-slate-900 dark:text-white whitespace-pre-line">
                  {order.shippingAddress}
                </p>
                {order.trackingNumber && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Tracking Number</h3>
                    <p className="font-mono font-medium text-emerald-600">{order.trackingNumber}</p>
                  </div>
                )}
              </Card>

              {/* Payment Info */}
              <Card padding="lg">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Payment Details</h3>
                <VStack gap="md">
                  {order.paymentTx && (
                    <div>
                      <span className="text-xs text-slate-500">Payment Transaction</span>
                      <p className="font-mono text-sm text-slate-900 dark:text-white truncate">
                        {order.paymentTx}
                      </p>
                    </div>
                  )}
                  {order.escrowAddress && (
                    <div>
                      <span className="text-xs text-slate-500">Escrow Address</span>
                      <p className="font-mono text-sm text-slate-900 dark:text-white truncate">
                        {order.escrowAddress}
                      </p>
                    </div>
                  )}
                </VStack>
              </Card>

              {/* Order Notes */}
              {order.notes && (
                <Card padding="lg">
                  <h3 className="text-sm font-medium text-slate-500 mb-4">Order Notes</h3>
                  <p className="text-slate-900 dark:text-white">{order.notes}</p>
                </Card>
              )}
            </div>
          </div>
        </Container>
      </main>

      <Footer />

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Open Dispute</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Please describe the issue with your order. The moderator will review your case.
            </p>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-4"
              placeholder="Describe your issue..."
            />
            <HStack justify="end" gap="sm">
              <Button variant="ghost" onClick={() => setShowDisputeModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleOpenDispute} disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Dispute'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Ship Order Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Ship Order</h2>
            <VStack gap="md">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                  Carrier
                </label>
                <input
                  type="text"
                  value={trackingInfo.carrier}
                  onChange={e => setTrackingInfo(prev => ({ ...prev, carrier: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., UPS, FedEx, DHL"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  value={trackingInfo.trackingNumber}
                  onChange={e =>
                    setTrackingInfo(prev => ({ ...prev, trackingNumber: e.target.value }))
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter tracking number"
                />
              </div>
            </VStack>
            <HStack justify="end" gap="sm" className="mt-6">
              <Button variant="ghost" onClick={() => setShowShipModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleShipOrder} disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Confirm Shipment'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}
    </div>
  );
}
