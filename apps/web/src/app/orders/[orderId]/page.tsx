'use client';

import React, { useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
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
import {
  OrderDetailContent,
  OrderFooter,
  type DisplayOrder,
  type OrderItem,
  type Moderator,
  type TimelineEvent,
} from '@/components/Order';

// ============ Utility Functions ============

// 将后端订单状态映射到 UI 状态
function mapOrderState(state: OrderState): DisplayOrder['status'] {
  const stateMap: Record<string, DisplayOrder['status']> = {
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

// 后端实际返回的订单数据结构
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
      buyerReceiveAddress?: string;
    };
    // RWA 原子交换支付锁定消息
    paymentLocked?: {
      lockTxHash?: string;
      coin?: string;
      amount?: string;
      paymentTokenAddress?: string;
      buyerReceiveAddress?: string;
      universalSwapAddress?: string;
      timestamp?: string;
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

  // 资金到账 (支持 PaymentSent 和 PaymentAuthorized 两种消息)
  if (
    data.funded ||
    contract.paymentSent ||
    contract.paymentLocked ||
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

// 将 CoreOrder 转换为本地 Order 格式
function transformCoreOrder(
  coreOrder: CoreOrder | RealOrderData | null,
  currentUserPeerID: string | null
): DisplayOrder | null {
  if (!coreOrder || !coreOrder.contract) {
    return null;
  }

  const data = coreOrder as RealOrderData;
  const contract = data.contract;

  const orderOpen = contract.orderOpen;
  const buyerOrder = contract.buyerOrder;

  type ListingType = NonNullable<
    NonNullable<RealOrderData['contract']['orderOpen']>['listings']
  >[0]['listing'];
  let listingData: ListingType | undefined;
  let vendorPeerID = '';
  let vendorHandle = '';

  if (orderOpen?.listings?.length) {
    const firstListing = orderOpen.listings[0];
    listingData = firstListing.listing;
    vendorPeerID = firstListing.listing?.vendorID?.peerID || firstListing.vendorID?.peerID || '';
    vendorHandle = firstListing.listing?.vendorID?.handle || '';
  } else if (contract.vendorListings?.length) {
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

  const buyerPeerID = orderOpen?.buyerID?.peerID || buyerOrder?.buyerID?.peerID || '';
  const buyerHandle = orderOpen?.buyerID?.handle || buyerOrder?.buyerID?.handle || '';

  // 支持 PaymentAuthorized (RWA) 和 PaymentSent (传统) 两种消息
  const paymentLocked = contract.paymentLocked;
  const paymentSent = contract.paymentSent;
  const buyerPayment = buyerOrder?.payment;
  const coin =
    paymentLocked?.coin ||
    paymentSent?.coin ||
    buyerPayment?.coin ||
    orderOpen?.pricingCoin ||
    'ETH';
  // 使用显式的 !== undefined 检查，避免 "0" 被当作 falsy 值处理
  const amount =
    paymentLocked?.amount !== undefined
      ? Number(paymentLocked.amount)
      : paymentSent?.amount !== undefined
        ? paymentSent.amount
        : buyerPayment?.amount !== undefined
          ? buyerPayment.amount
          : orderOpen?.amount !== undefined
            ? orderOpen.amount
            : (listingData?.item?.price ?? 0);
  const paymentMethod = paymentSent?.method || buyerPayment?.method || '';
  const moderatorId = paymentSent?.moderator || buyerPayment?.moderator || '';

  const divisibility = listingData?.metadata?.pricingCurrency?.divisibility || 2;
  const timestamp = orderOpen?.timestamp || buyerOrder?.timestamp || '';
  const fulfillments = contract.orderFulfillments || contract.vendorOrderFulfillment;
  const trackingInfo = fulfillments?.[0]?.physicalDelivery?.[0];
  const shipping = orderOpen?.shipping || buyerOrder?.shipping;

  const paymentAddress =
    paymentSent?.address ||
    buyerPayment?.address ||
    contract.orderConfirmation?.paymentAddress ||
    contract.vendorOrderConfirmation?.paymentAddress;

  const notes = orderOpen?.alternateContactInfo || buyerOrder?.alternateContactInfo;
  const orderOpenItems = orderOpen?.items || buyerOrder?.items || [];

  let userRole: DisplayOrder['userRole'] = 'buyer';
  if (currentUserPeerID) {
    if (currentUserPeerID === vendorPeerID) {
      userRole = 'seller';
    } else if (currentUserPeerID === buyerPeerID) {
      userRole = 'buyer';
    } else if (moderatorId === currentUserPeerID) {
      userRole = 'moderator';
    }
  }

  const itemImages = listingData?.item?.images || [];
  const itemImageUrl = itemImages.length > 0 ? getThumbnailUrl(itemImages[0]) : '';

  const orderId = listingData?.slug || '';
  const itemTitle = listingData?.item?.title || 'Unknown Item';
  const itemPrice = listingData?.item?.price || 0;

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

  const moderator: Moderator | undefined =
    paymentMethod === 'MODERATED' && moderatorId
      ? {
          id: moderatorId,
          name: moderatorId.slice(0, 12) + '...',
          avatar: '',
          fee: 1,
        }
      : undefined;

  const result: DisplayOrder = {
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
    // 支持 RWA 预授权和传统交易
    paymentTx: contract.paymentLocked?.lockTxHash || data.paymentAddressTransactions?.[0]?.txid,
    // RWA 支付锁定信息
    paymentLocked: contract.paymentLocked
      ? {
          amount: contract.paymentLocked.amount || '',
          coin: contract.paymentLocked.coin || '',
          buyerReceiveAddress: contract.paymentLocked.buyerReceiveAddress || '',
          lockTxHash: contract.paymentLocked.lockTxHash || '',
          timestamp: contract.paymentLocked.timestamp,
        }
      : undefined,
    escrowAddress: paymentAddress,
    notes: notes,
    timeline: generateTimelineFromRealData(data),
    userRole,
  };

  return result;
}

// ============ Main Component ============

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
  const displayOrder = useMemo(() => {
    if (!coreOrder) return null;
    return transformCoreOrder(coreOrder, currentUserPeerID);
  }, [coreOrder, currentUserPeerID]);

  // 统一处理订单操作（用于 OrderFooter）
  const handleOrderAction = useCallback((action: OrderAction) => {
    switch (action) {
      case 'Pay':
        window.alert('Payment flow coming soon');
        break;
      case 'Cancel':
        window.alert('Cancel order flow coming soon');
        break;
      case 'Dispute':
        // 将在 OrderDetailContent 中处理
        break;
      case 'Complete':
        // 将在 OrderDetailContent 中处理
        break;
      case 'WriteReview':
        window.alert('Review feature coming soon');
        break;
      case 'Accept':
        window.alert('Accept order flow coming soon');
        break;
      case 'Decline':
        window.alert('Decline order flow coming soon');
        break;
      case 'Fulfill':
        // 将在 OrderDetailContent 中处理
        break;
      case 'Refund':
        // 将在 OrderDetailContent 中处理
        break;
      case 'Claim':
        window.alert('Claim payment flow coming soon');
        break;
      case 'AcceptPayout':
        window.alert('Accept payout flow coming soon');
        break;
    }
  }, []);

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
              <div className="my-6 px-8">
                <Skeleton variant="rounded" width="100%" height={60} />
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-4 text-sm touch-feedback"
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

          {/* Order Detail Content */}
          <Card className="mb-4 sm:mb-6 p-3 sm:p-6">
            <OrderDetailContent
              displayOrder={displayOrder}
              coreOrder={coreOrder}
              currentUserPeerID={currentUserPeerID}
              inModal={false}
              showFooter={false}
              refetch={refetch}
            />
          </Card>

          {/* Desktop: Sidebar with Seller Info - Hidden on mobile */}
          <div className="hidden lg:block mt-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Seller Info */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Seller</h3>
                <HStack gap="sm" align="center">
                  <Avatar
                    src={displayOrder.vendor.avatar}
                    name={displayOrder.vendor.name}
                    size="md"
                    className="w-12 h-12"
                  />
                  <VStack gap="none">
                    <Link
                      href={`/store/${displayOrder.vendor.id}`}
                      className="font-semibold text-foreground hover:text-primary text-sm"
                    >
                      {displayOrder.vendor.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">View Store</span>
                  </VStack>
                </HStack>
              </Card>

              {/* Buyer Info */}
              {displayOrder.buyer && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Buyer</h3>
                  <HStack gap="sm" align="center">
                    <Avatar
                      src={displayOrder.buyer.avatar}
                      name={displayOrder.buyer.name}
                      size="md"
                      className="w-12 h-12"
                    />
                    <VStack gap="none">
                      <span className="font-semibold text-foreground text-sm">
                        {displayOrder.buyer.name}
                      </span>
                      <span className="text-xs text-muted-foreground">Buyer</span>
                    </VStack>
                  </HStack>
                </Card>
              )}

              {/* Moderator Info */}
              {displayOrder.moderator && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Moderator</h3>
                  <HStack gap="sm" align="center">
                    <Avatar
                      src={displayOrder.moderator.avatar}
                      name={displayOrder.moderator.name}
                      size="md"
                      className="w-12 h-12"
                    />
                    <VStack gap="none">
                      <Link
                        href={`/moderators/${displayOrder.moderator.id}`}
                        className="font-semibold text-foreground hover:text-primary text-sm"
                      >
                        {displayOrder.moderator.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {displayOrder.moderator.fee}% fee
                      </span>
                    </VStack>
                  </HStack>
                </Card>
              )}
            </div>
          </div>

          {/* Spacer for fixed bottom bar (OrderFooter) */}
          <div className="h-16" />
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
    </div>
  );
}
