'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import {
  useOrder,
  getImageUrl,
  useUserStore,
  useI18n,
  isOrderFulfilled,
  type OrderAction,
  type UserRole as CoreUserRole,
} from '@mobazha/core';
import type { Order as CoreOrder, OrderState } from '@mobazha/core';
import { OrderFooter } from '@/components/Order';

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

// 将后端订单状态映射到 UI 状态
function mapOrderState(state: OrderState): Order['status'] {
  const stateMap: Record<string, Order['status']> = {
    PENDING: 'pending',
    AWAITING_PAYMENT: 'awaiting_payment',
    AWAITING_PICKUP: 'processing',
    AWAITING_FULFILLMENT: 'processing',
    PARTIALLY_FULFILLED: 'processing',
    FULFILLED: 'shipped',
    COMPLETED: 'completed',
    CANCELED: 'cancelled',
    DECLINED: 'cancelled',
    REFUNDED: 'refunded',
    DISPUTED: 'disputed',
    DECIDED: 'disputed',
    RESOLVED: 'completed',
    PAYMENT_FINALIZED: 'completed',
    PROCESSING_ERROR: 'pending',
  };
  return stateMap[state] || 'pending';
}

// 格式化价格金额
function formatPriceAmount(amount: number, divisibility: number = 2): string {
  const normalAmount = amount / Math.pow(10, divisibility);
  return normalAmount.toFixed(divisibility);
}

// 从图片对象获取 URL
function getThumbnailUrl(
  image:
    | { tiny?: string; small?: string; medium?: string; large?: string; original?: string }
    | undefined
): string {
  if (!image) return '';
  const hash = image.medium || image.small || image.tiny || image.large || image.original || '';
  return getImageUrl(hash) || '';
}

// 格式化地址
function formatShippingAddress(shipping?: {
  name?: string;
  company?: string;
  addressLineOne?: string;
  addressLineTwo?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): string {
  if (!shipping) return 'No shipping address';
  const parts = [
    shipping.name,
    shipping.company,
    shipping.addressLineOne,
    shipping.addressLineTwo,
    [shipping.city, shipping.state, shipping.postalCode].filter(Boolean).join(', '),
    shipping.country,
  ].filter(Boolean);
  return parts.join('\n') || 'No shipping address';
}

// 后端实际返回的订单数据结构（与类型定义不同）
interface RealOrderData {
  state: string;
  funded?: boolean;
  read?: boolean;
  unreadChatMessages?: number;
  paymentAddressTransactions?: { txid: string; value: number; confirmations: number }[];
  contract: {
    orderOpen?: {
      timestamp?: string;
      buyerID?: { peerID?: string; handle?: string };
      listings?: Array<{
        vendorID?: { peerID?: string };
        listing?: {
          slug?: string;
          metadata?: { contractType?: string; pricingCurrency?: { divisibility?: number } };
          item?: {
            title?: string;
            images?: Array<{ tiny?: string; small?: string; medium?: string }>;
            price?: number;
          };
          vendorID?: { peerID?: string; handle?: string };
          shippingOptions?: Array<{ regions?: string[] }>;
        };
      }>;
      items?: Array<{ quantity?: number; memo?: string }>;
      shipping?: {
        name?: string;
        company?: string;
        addressLineOne?: string;
        addressLineTwo?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      pricingCoin?: string;
      amount?: number;
      alternateContactInfo?: string;
    };
    paymentSent?: {
      moderator?: string;
      coin?: string;
      amount?: number;
      method?: string;
      address?: string;
    };
    orderConfirmation?: {
      timestamp?: string;
      paymentAddress?: string;
    };
    orderFulfillments?: Array<{
      timestamp?: string;
      physicalDelivery?: Array<{ shipper?: string; trackingNumber?: string }>;
      note?: string;
    }>;
    orderComplete?: {
      timestamp?: string;
    };
    disputeOpen?: {
      timestamp?: string;
    };
    disputeResolution?: {
      timestamp?: string;
      resolution?: string;
    };
    // 兼容旧格式
    vendorListings?: Array<{
      slug?: string;
      vendorID?: { peerID?: string; handle?: string };
      metadata?: { contractType?: string; pricingCurrency?: { divisibility?: number } };
      item?: {
        title?: string;
        images?: Array<{ tiny?: string; small?: string; medium?: string }>;
        price?: number;
      };
    }>;
    buyerOrder?: {
      timestamp?: string;
      buyerID?: { peerID?: string; handle?: string };
      items?: Array<{ quantity?: number; memo?: string }>;
      shipping?: {
        name?: string;
        company?: string;
        addressLineOne?: string;
        addressLineTwo?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      payment?: {
        moderator?: string;
        coin?: string;
        amount?: number;
        method?: string;
        address?: string;
      };
      alternateContactInfo?: string;
    };
    vendorOrderConfirmation?: {
      timestamp?: string;
      paymentAddress?: string;
    };
    vendorOrderFulfillment?: Array<{
      timestamp?: string;
      physicalDelivery?: Array<{ shipper?: string; trackingNumber?: string }>;
      note?: string;
    }>;
    buyerOrderCompletion?: {
      timestamp?: string;
    };
  };
}

// 根据实际订单数据生成时间线
function generateTimelineFromRealData(data: RealOrderData): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];
  const contract = data.contract;

  // 支持两种格式
  const orderOpen = contract.orderOpen;
  const buyerOrder = contract.buyerOrder;
  const orderTimestamp = orderOpen?.timestamp || buyerOrder?.timestamp;

  // 订单创建
  if (orderTimestamp) {
    timeline.push({
      status: 'created',
      timestamp: orderTimestamp,
      description: 'Order placed',
      actor: 'buyer',
    });
  }

  // 资金到账
  if (
    data.funded ||
    contract.paymentSent ||
    (data.paymentAddressTransactions && data.paymentAddressTransactions.length > 0)
  ) {
    const confirmTimestamp =
      contract.orderConfirmation?.timestamp ||
      contract.vendorOrderConfirmation?.timestamp ||
      orderTimestamp ||
      '';
    timeline.push({
      status: 'paid',
      timestamp: confirmTimestamp,
      description: 'Payment confirmed',
      actor: 'system',
    });
  }

  // 卖家确认
  const orderConfirmation = contract.orderConfirmation || contract.vendorOrderConfirmation;
  if (orderConfirmation) {
    timeline.push({
      status: 'processing',
      timestamp: orderConfirmation.timestamp || '',
      description: 'Vendor confirmed order',
      actor: 'seller',
    });
  }

  // 发货
  const fulfillments = contract.orderFulfillments || contract.vendorOrderFulfillment;
  if (fulfillments?.length) {
    const fulfillment = fulfillments[0];
    const trackingInfo = fulfillment.physicalDelivery?.[0];
    timeline.push({
      status: 'shipped',
      timestamp: fulfillment.timestamp || '',
      description: trackingInfo
        ? `Package shipped - ${trackingInfo.shipper}: ${trackingInfo.trackingNumber}`
        : 'Package shipped',
      actor: 'seller',
    });
  }

  // 完成
  const orderComplete = contract.orderComplete || contract.buyerOrderCompletion;
  if (orderComplete) {
    timeline.push({
      status: 'completed',
      timestamp: orderComplete.timestamp || '',
      description: 'Order completed - Funds released to seller',
      actor: 'buyer',
    });
  }

  // 争议
  if (contract.disputeOpen) {
    timeline.push({
      status: 'disputed',
      timestamp: contract.disputeOpen.timestamp || '',
      description: 'Dispute opened',
      actor: 'buyer',
    });
  }

  // 争议解决
  if (contract.disputeResolution) {
    timeline.push({
      status: 'resolved',
      timestamp: contract.disputeResolution.timestamp || '',
      description: `Dispute resolved: ${contract.disputeResolution.resolution || 'N/A'}`,
      actor: 'moderator',
    });
  }

  return timeline;
}

// 将 CoreOrder 转换为本地 Order 格式（支持新旧两种后端数据格式）
function transformCoreOrder(
  coreOrder: CoreOrder | RealOrderData | null,
  currentUserPeerID: string | null
): Order | null {
  if (!coreOrder || !coreOrder.contract) {
    return null;
  }

  const data = coreOrder as RealOrderData;
  const contract = data.contract;

  // 尝试从两种格式获取数据
  // 新格式: contract.orderOpen.listings[].listing
  // 旧格式: contract.vendorListings[]
  const orderOpen = contract.orderOpen;
  const buyerOrder = contract.buyerOrder;

  // 获取 listings
  type ListingType = NonNullable<
    NonNullable<RealOrderData['contract']['orderOpen']>['listings']
  >[0]['listing'];
  let listingData: ListingType | undefined;
  let vendorPeerID = '';
  let vendorHandle = '';

  if (orderOpen?.listings?.length) {
    // 新格式
    const firstListing = orderOpen.listings[0];
    listingData = firstListing.listing;
    vendorPeerID = firstListing.listing?.vendorID?.peerID || firstListing.vendorID?.peerID || '';
    vendorHandle = firstListing.listing?.vendorID?.handle || '';
  } else if (contract.vendorListings?.length) {
    // 旧格式
    const firstListing = contract.vendorListings[0];
    listingData = {
      slug: firstListing.slug,
      metadata: firstListing.metadata,
      item: firstListing.item,
      vendorID: firstListing.vendorID,
    };
    vendorPeerID = firstListing.vendorID?.peerID || '';
    vendorHandle = firstListing.vendorID?.handle || '';
  }

  // 获取买家信息
  const buyerPeerID = orderOpen?.buyerID?.peerID || buyerOrder?.buyerID?.peerID || '';
  const buyerHandle = orderOpen?.buyerID?.handle || buyerOrder?.buyerID?.handle || '';

  // 获取支付信息
  const paymentSent = contract.paymentSent;
  const buyerPayment = buyerOrder?.payment;
  const coin = paymentSent?.coin || buyerPayment?.coin || orderOpen?.pricingCoin || 'ETH';
  const amount =
    paymentSent?.amount ||
    buyerPayment?.amount ||
    orderOpen?.amount ||
    listingData?.item?.price ||
    0;
  const paymentMethod = paymentSent?.method || buyerPayment?.method || '';
  const moderatorId = paymentSent?.moderator || buyerPayment?.moderator || '';

  // 获取divisibility
  const divisibility = listingData?.metadata?.pricingCurrency?.divisibility || 2;

  // 获取订单时间戳
  const timestamp = orderOpen?.timestamp || buyerOrder?.timestamp || '';

  // 获取物流信息
  const fulfillments = contract.orderFulfillments || contract.vendorOrderFulfillment;
  const trackingInfo = fulfillments?.[0]?.physicalDelivery?.[0];

  // 获取订单地址信息
  const shipping = orderOpen?.shipping || buyerOrder?.shipping;

  // 获取支付地址
  const paymentAddress =
    paymentSent?.address ||
    buyerPayment?.address ||
    contract.orderConfirmation?.paymentAddress ||
    contract.vendorOrderConfirmation?.paymentAddress;

  // 获取订单备注
  const notes = orderOpen?.alternateContactInfo || buyerOrder?.alternateContactInfo;

  // 获取订单项
  const orderOpenItems = orderOpen?.items || buyerOrder?.items || [];

  // 确定用户角色
  let userRole: Order['userRole'] = 'buyer';
  if (currentUserPeerID) {
    if (currentUserPeerID === vendorPeerID) {
      userRole = 'seller';
    } else if (currentUserPeerID === buyerPeerID) {
      userRole = 'buyer';
    } else if (moderatorId === currentUserPeerID) {
      userRole = 'moderator';
    }
  }

  // 提取商品图片
  const itemImages = listingData?.item?.images || [];
  const itemImageUrl = itemImages.length > 0 ? getThumbnailUrl(itemImages[0]) : '';

  // 获取订单 ID（使用 slug）
  const orderId = listingData?.slug || '';
  const itemTitle = listingData?.item?.title || 'Unknown Item';
  const itemPrice = listingData?.item?.price || 0;

  // 构建订单项
  const orderItems: OrderItem[] =
    orderOpenItems.length > 0
      ? orderOpenItems.map((item, index) => ({
          id: `item-${index}`,
          title: itemTitle,
          image: itemImageUrl,
          quantity: item.quantity || 1,
          price: formatPriceAmount(itemPrice, divisibility),
          currency: coin,
        }))
      : [
          {
            id: 'item-0',
            title: itemTitle,
            image: itemImageUrl,
            quantity: 1,
            price: formatPriceAmount(itemPrice, divisibility),
            currency: coin,
          },
        ];

  // 构建仲裁员信息（如果存在）
  const moderator: Moderator | undefined =
    paymentMethod === 'MODERATED' && moderatorId
      ? {
          id: moderatorId,
          name: moderatorId.slice(0, 12) + '...',
          avatar: '',
          fee: 1,
        }
      : undefined;

  const result: Order = {
    id: orderId,
    orderId: orderId,
    status: mapOrderState(data.state as OrderState),
    items: orderItems,
    total: formatPriceAmount(amount, divisibility),
    currency: coin,
    createdAt: timestamp,
    vendor: {
      id: vendorPeerID,
      name: vendorHandle || (vendorPeerID ? vendorPeerID.slice(0, 12) + '...' : 'Unknown'),
      avatar: '',
      peerID: vendorPeerID,
    },
    buyer: {
      id: buyerPeerID,
      name: buyerHandle || (buyerPeerID ? buyerPeerID.slice(0, 12) + '...' : 'Unknown'),
      avatar: '',
      peerID: buyerPeerID,
    },
    moderator,
    trackingNumber: trackingInfo?.trackingNumber,
    shippingAddress: formatShippingAddress(shipping),
    paymentTx: data.paymentAddressTransactions?.[0]?.txid,
    escrowAddress: paymentAddress,
    notes: notes,
    timeline: generateTimelineFromRealData(data),
    userRole,
  };

  return result;
}

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
  const { t } = useI18n();
  const orderId = params.orderId as string;

  // 获取当前用户信息
  const currentUser = useUserStore(state => state.profile);
  const currentUserPeerID = currentUser?.peerID || null;

  // 使用 hook 获取订单数据
  const {
    order: coreOrder,
    isLoading: orderLoading,
    error: orderError,
    refetch,
  } = useOrder(orderId);

  // 转换订单数据
  const order = useMemo(() => {
    if (!coreOrder) return null;
    return transformCoreOrder(coreOrder, currentUserPeerID);
  }, [coreOrder, currentUserPeerID]);

  // 本地状态用于 UI 操作
  const [localOrder, setLocalOrder] = useState<Order | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [trackingInfo, setTrackingInfo] = useState({ carrier: '', trackingNumber: '' });
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState<'buyer' | 'seller' | 'split' | null>(
    null
  );

  // 当从 API 获取到订单时，同步到本地状态
  React.useEffect(() => {
    if (order) {
      setLocalOrder(order);
    }
  }, [order]);

  // 使用本地状态（如果有本地修改）或 API 数据
  const displayOrder = localOrder || order;

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
    setIsActionLoading(true);
    try {
      // TODO: Call escrow service to release funds
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLocalOrder(prev =>
        prev
          ? {
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
            }
          : null
      );
      window.alert('Order completed successfully! Funds have been released to the seller.');
      refetch(); // 重新获取订单数据
    } catch (error) {
      window.alert('Failed to confirm receipt: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [refetch]);

  const handleOpenDispute = useCallback(async () => {
    if (!disputeReason.trim()) {
      window.alert('Please provide a reason for the dispute');
      return;
    }
    setIsActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLocalOrder(prev =>
        prev
          ? {
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
            }
          : null
      );
      setShowDisputeModal(false);
      setDisputeReason('');
      window.alert('Dispute has been opened. The moderator will review your case.');
      refetch();
    } catch (error) {
      window.alert('Failed to open dispute: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [disputeReason, refetch]);

  const handleShipOrder = useCallback(async () => {
    if (!trackingInfo.trackingNumber.trim()) {
      window.alert('Please provide tracking information');
      return;
    }
    setIsActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLocalOrder(prev =>
        prev
          ? {
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
            }
          : null
      );
      setShowShipModal(false);
      setTrackingInfo({ carrier: '', trackingNumber: '' });
      window.alert('Order marked as shipped!');
      refetch();
    } catch (error) {
      window.alert('Failed to update shipping: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [trackingInfo, refetch]);

  const handleRefundConfirm = useCallback(async () => {
    setShowRefundDialog(false);
    setIsActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLocalOrder(prev =>
        prev
          ? {
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
            }
          : null
      );
      window.alert('Refund processed successfully!');
      refetch();
    } catch (error) {
      window.alert('Failed to process refund: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [refetch]);

  const handleResolveDisputeConfirm = useCallback(async () => {
    if (!showResolveDialog) return;
    const decision = showResolveDialog;
    setShowResolveDialog(null);
    setIsActionLoading(true);
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

      setLocalOrder(prev =>
        prev
          ? {
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
            }
          : null
      );
      window.alert('Dispute has been resolved!');
      refetch();
    } catch (error) {
      window.alert('Failed to resolve dispute: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [showResolveDialog, refetch]);

  // 统一处理订单操作（用于 OrderFooter）
  const handleOrderAction = useCallback(
    (action: OrderAction) => {
      switch (action) {
        case 'Pay':
          // TODO: Navigate to payment page
          window.alert('Payment flow coming soon');
          break;
        case 'Cancel':
          // TODO: Implement cancel order
          window.alert('Cancel order flow coming soon');
          break;
        case 'Dispute':
          setShowDisputeModal(true);
          break;
        case 'Complete':
          handleConfirmReceipt();
          break;
        case 'WriteReview':
          // TODO: Navigate to review page
          window.alert('Review feature coming soon');
          break;
        case 'Accept':
          // TODO: Implement accept order
          window.alert('Accept order flow coming soon');
          break;
        case 'Decline':
          // TODO: Implement decline order
          window.alert('Decline order flow coming soon');
          break;
        case 'Fulfill':
          setShowShipModal(true);
          break;
        case 'Refund':
          setShowRefundDialog(true);
          break;
        case 'Claim':
          // TODO: Implement claim payment
          window.alert('Claim payment flow coming soon');
          break;
        case 'AcceptPayout':
          // TODO: Implement accept payout
          window.alert('Accept payout flow coming soon');
          break;
      }
    },
    [handleConfirmReceipt]
  );

  // 加载状态
  if (orderLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-4 sm:py-8">
          <Container size="xl">
            <Skeleton variant="text" width={100} height={20} className="mb-4" />
            <Card className="mb-4 sm:mb-6 p-3 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="rounded" width={80} height={28} />
              </div>
              <Skeleton variant="text" width="30%" height={16} className="mb-4" />
              <div className="flex gap-2 mb-6">
                <Skeleton variant="rounded" width={100} height={36} />
                <Skeleton variant="rounded" width={120} height={36} />
              </div>
              <Skeleton variant="text" width="20%" height={24} className="mb-3" />
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 mb-4">
                  <Skeleton variant="circular" width={16} height={16} />
                  <div className="flex-1">
                    <Skeleton variant="text" width="60%" height={18} />
                    <Skeleton variant="text" width="30%" height={14} className="mt-1" />
                  </div>
                </div>
              ))}
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <Card className="p-3 sm:p-6">
                  <Skeleton variant="text" width="30%" height={24} className="mb-4" />
                  <div className="flex gap-4 mb-4">
                    <Skeleton variant="rectangular" width={96} height={96} className="rounded-lg" />
                    <div className="flex-1">
                      <Skeleton variant="text" width="70%" height={20} />
                      <Skeleton variant="text" width="30%" height={16} className="mt-2" />
                      <Skeleton variant="text" width="40%" height={20} className="mt-2" />
                    </div>
                  </div>
                </Card>
              </div>
              <div className="space-y-4">
                <Card className="p-3 sm:p-6">
                  <Skeleton variant="text" width="40%" height={16} className="mb-3" />
                  <div className="flex gap-3">
                    <Skeleton variant="circular" width={48} height={48} />
                    <div>
                      <Skeleton variant="text" width={100} height={18} />
                      <Skeleton variant="text" width={60} height={14} className="mt-1" />
                    </div>
                  </div>
                </Card>
                <Card className="p-3 sm:p-6">
                  <Skeleton variant="text" width="50%" height={16} className="mb-3" />
                  <Skeleton variant="text" width="100%" height={60} />
                </Card>
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  // 错误状态
  if (orderError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container className="py-8">
          <Card className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t('order.loadOrderFailed')}
            </h2>
            <p className="text-muted-foreground mb-4">{orderError}</p>
            <Button onClick={() => refetch()}>{t('order.tryAgain')}</Button>
          </Card>
        </Container>
        <Footer />
      </div>
    );
  }

  // 订单不存在
  if (!displayOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container className="py-8">
          <Card className="py-16 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t('order.orderNotFound')}
            </h2>
            <p className="text-muted-foreground mb-4">{t('order.orderNotFoundMessage')}</p>
            <Button onClick={() => router.push('/orders')}>{t('order.backToOrders')}</Button>
          </Card>
        </Container>
        <Footer />
      </div>
    );
  }

  // Determine available actions based on status and role
  const canConfirmReceipt =
    displayOrder.userRole === 'buyer' && ['shipped', 'delivered'].includes(displayOrder.status);
  const canOpenDispute =
    displayOrder.userRole === 'buyer' &&
    ['paid', 'processing', 'shipped', 'delivered'].includes(displayOrder.status) &&
    !displayOrder.dispute;
  const canShipOrder =
    displayOrder.userRole === 'seller' && ['paid', 'processing'].includes(displayOrder.status);
  const canRefund =
    displayOrder.userRole === 'seller' &&
    ['paid', 'processing', 'shipped'].includes(displayOrder.status);
  const canResolveDispute =
    displayOrder.userRole === 'moderator' && displayOrder.status === 'disputed';

  const isLoading = isActionLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-slate-900 dark:hover:text-white mb-4 text-sm touch-feedback"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('order.backToOrders')}
          </button>

          {/* Order Header */}
          <Card className="mb-4 sm:mb-6 p-3 sm:p-6">
            {/* Title and Status Row */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">
                Order #{displayOrder.orderId}
              </h1>
              <span
                className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium text-white flex-shrink-0 ${statusColors[displayOrder.status]}`}
              >
                {statusLabels[displayOrder.status] || displayOrder.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Placed on {formatDate(displayOrder.createdAt)}
            </p>

            {/* Actions - Mobile: Vertical Stack, Desktop: Horizontal */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Button variant="outline" size="sm" className="justify-center touch-feedback">
                <svg
                  className="w-4 h-4 mr-1.5"
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
                <Button
                  size="sm"
                  onClick={handleConfirmReceipt}
                  disabled={isLoading}
                  className="justify-center touch-feedback"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {isLoading ? 'Processing...' : 'Confirm Receipt'}
                </Button>
              )}

              {canOpenDispute && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-500 hover:bg-red-50 justify-center touch-feedback"
                  onClick={() => setShowDisputeModal(true)}
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Open Dispute
                </Button>
              )}

              {canShipOrder && (
                <Button
                  size="sm"
                  onClick={() => setShowShipModal(true)}
                  className="justify-center touch-feedback"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  Mark as Shipped
                </Button>
              )}

              {canRefund && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRefundDialog(true)}
                  disabled={isLoading}
                  className="justify-center touch-feedback"
                >
                  Refund Order
                </Button>
              )}
            </div>

            {/* Dispute Banner */}
            {displayOrder.dispute && (
              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-red-700 dark:text-red-400 mb-0.5 text-sm sm:text-base">
                      Dispute Open
                    </h3>
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-300">
                      {displayOrder.dispute.claim}
                    </p>
                    <p className="text-[10px] sm:text-xs text-red-500 mt-0.5">
                      Initiated by {displayOrder.dispute.initiator} • Status:{' '}
                      {displayOrder.dispute.status}
                    </p>
                  </div>
                  {canResolveDispute && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setShowResolveDialog('buyer')}
                        className="text-xs"
                      >
                        Favor Buyer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowResolveDialog('seller')}
                        className="text-xs"
                      >
                        Favor Seller
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowResolveDialog('split')}
                        className="text-xs"
                      >
                        Split
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Timeline */}
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3">
                Order Timeline
              </h2>
              <div className="relative">
                {displayOrder.timeline.map((event, index) => (
                  <div key={index} className="flex gap-3 mb-4 last:mb-0">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${statusColors[event.status] || 'bg-slate-400'}`}
                      />
                      {index < displayOrder.timeline.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm sm:text-base">
                            {event.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(event.timestamp)}
                          </p>
                        </div>
                        {event.actor && (
                          <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-muted-foreground rounded capitalize flex-shrink-0">
                            {event.actor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Order Items */}
            <div className="lg:col-span-2">
              <Card className="p-3 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                  Order Items
                </h2>
                <VStack gap="md">
                  {displayOrder.items.map(item => (
                    <HStack key={item.id} gap="sm" align="start" className="sm:gap-4">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <VStack gap="xs" className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground text-sm sm:text-base truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                        <p className="font-semibold text-foreground text-sm sm:text-base">
                          {item.price} {item.currency}
                        </p>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>

                {/* Order Summary */}
                <div className="mt-4 pt-4 sm:mt-6 sm:pt-6 border-t border-border">
                  <HStack justify="between" className="mb-1.5 sm:mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Subtotal</span>
                    <span className="text-xs sm:text-sm text-foreground">
                      {displayOrder.total} {displayOrder.currency}
                    </span>
                  </HStack>
                  <HStack justify="between" className="mb-1.5 sm:mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Shipping</span>
                    <span className="text-xs sm:text-sm text-foreground">Free</span>
                  </HStack>
                  {displayOrder.moderator && (
                    <HStack justify="between" className="mb-1.5 sm:mb-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Moderator Fee
                      </span>
                      <span className="text-xs sm:text-sm text-foreground">
                        {displayOrder.moderator.fee}%
                      </span>
                    </HStack>
                  )}
                  <HStack justify="between" className="pt-3 sm:pt-4 border-t border-border">
                    <span className="font-semibold text-foreground text-sm sm:text-base">
                      Total
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-emerald-600">
                      {displayOrder.total} {displayOrder.currency}
                    </span>
                  </HStack>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Parties Info */}
              <Card className="p-3 sm:p-6">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3">
                  Seller
                </h3>
                <HStack gap="sm" align="center" className="mb-3">
                  <Avatar
                    src={displayOrder.vendor.avatar}
                    name={displayOrder.vendor.name}
                    size="md"
                    className="w-10 h-10 sm:w-12 sm:h-12"
                  />
                  <VStack gap="none">
                    <Link
                      href={`/store/${displayOrder.vendor.id}`}
                      className="font-semibold text-foreground hover:text-emerald-600 text-sm"
                    >
                      {displayOrder.vendor.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">View Store</span>
                  </VStack>
                </HStack>

                {displayOrder.moderator && (
                  <>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 mt-4">
                      Moderator
                    </h3>
                    <HStack gap="sm" align="center">
                      <Avatar
                        src={displayOrder.moderator.avatar}
                        name={displayOrder.moderator.name}
                        size="md"
                        className="w-10 h-10 sm:w-12 sm:h-12"
                      />
                      <VStack gap="none">
                        <Link
                          href={`/moderators/${displayOrder.moderator.id}`}
                          className="font-semibold text-foreground hover:text-emerald-600 text-sm"
                        >
                          {displayOrder.moderator.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {displayOrder.moderator.fee}% fee
                        </span>
                      </VStack>
                    </HStack>
                  </>
                )}
              </Card>

              {/* Shipping Info */}
              <Card className="p-3 sm:p-6">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">
                  Shipping Address
                </h3>
                <p className="text-foreground whitespace-pre-line text-sm">
                  {displayOrder.shippingAddress}
                </p>
                {displayOrder.trackingNumber && (
                  <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-border">
                    <h3 className="text-xs font-medium text-muted-foreground mb-1">
                      Tracking Number
                    </h3>
                    <p className="font-mono font-medium text-emerald-600 text-sm">
                      {displayOrder.trackingNumber}
                    </p>
                  </div>
                )}
              </Card>

              {/* Payment Info */}
              <Card className="p-3 sm:p-6">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">
                  Payment Details
                </h3>
                <VStack gap="sm">
                  {displayOrder.paymentTx && (
                    <div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        Payment Transaction
                      </span>
                      <p className="font-mono text-xs sm:text-sm text-foreground truncate">
                        {displayOrder.paymentTx}
                      </p>
                    </div>
                  )}
                  {displayOrder.escrowAddress && (
                    <div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        Escrow Address
                      </span>
                      <p className="font-mono text-xs sm:text-sm text-foreground truncate">
                        {displayOrder.escrowAddress}
                      </p>
                    </div>
                  )}
                </VStack>
              </Card>

              {/* Order Notes */}
              {displayOrder.notes && (
                <Card className="p-3 sm:p-6">
                  <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
                    Order Notes
                  </h3>
                  <p className="text-foreground text-sm">{displayOrder.notes}</p>
                </Card>
              )}
            </div>
          </div>
        </Container>
      </main>

      {/* Order Action Footer */}
      <OrderFooter
        orderState={coreOrder?.state || 'PENDING'}
        userRole={displayOrder.userRole as CoreUserRole}
        timestamp={displayOrder.createdAt}
        isModerated={!!displayOrder.moderator}
        isFulfilled={coreOrder ? isOrderFulfilled(coreOrder) : false}
        paymentMethod={coreOrder?.contract?.buyerOrder?.payment?.method}
        totalAmount={displayOrder.total}
        currency={displayOrder.currency}
        paymentCoin={coreOrder?.contract?.buyerOrder?.payment?.coin}
        onAction={handleOrderAction}
      />

      <Footer />

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <Card className="w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">Open Dispute</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Please describe the issue with your order. The moderator will review your case.
            </p>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-3 text-sm"
              placeholder="Describe your issue..."
            />
            <HStack justify="end" gap="sm">
              <Button variant="ghost" size="sm" onClick={() => setShowDisputeModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleOpenDispute} disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Dispute'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Ship Order Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <Card className="w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">Ship Order</h2>
            <VStack gap="sm">
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
                  Carrier
                </label>
                <input
                  type="text"
                  value={trackingInfo.carrier}
                  onChange={e => setTrackingInfo(prev => ({ ...prev, carrier: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="e.g., UPS, FedEx, DHL"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  value={trackingInfo.trackingNumber}
                  onChange={e =>
                    setTrackingInfo(prev => ({ ...prev, trackingNumber: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="Enter tracking number"
                />
              </div>
            </VStack>
            <HStack justify="end" gap="sm" className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setShowShipModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleShipOrder} disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Confirm Shipment'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Refund Confirmation AlertDialog */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to refund this order? The funds will be returned to the buyer.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefundConfirm}>Refund</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolve Dispute AlertDialog */}
      <AlertDialog
        open={!!showResolveDialog}
        onOpenChange={open => !open && setShowResolveDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Dispute</AlertDialogTitle>
            <AlertDialogDescription>
              {showResolveDialog === 'buyer' &&
                'Are you sure you want to resolve this dispute in favor of the buyer? Full refund will be issued.'}
              {showResolveDialog === 'seller' &&
                'Are you sure you want to resolve this dispute in favor of the seller? Full payment will be released.'}
              {showResolveDialog === 'split' &&
                'Are you sure you want to split the funds between buyer and seller?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolveDisputeConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
