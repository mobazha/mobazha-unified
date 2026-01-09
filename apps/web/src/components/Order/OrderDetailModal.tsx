'use client';

import React, { memo, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { cn } from '@/lib/utils';
import { useOrder, getImageUrl, useUserStore, useI18n } from '@mobazha/core';
import type { Order as CoreOrder, OrderState } from '@mobazha/core';
import {
  OrderDetailContent,
  type DisplayOrder,
  type OrderItem,
  type Moderator,
  type TimelineEvent,
} from './OrderDetailContent';
import { X } from 'lucide-react';

// ============ Types ============

export interface OrderDetailModalProps {
  /** 订单 ID */
  orderId: string | null;
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 订单更新后回调 */
  onOrderUpdate?: () => void;
  className?: string;
}

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
    paymentTx: data.paymentAddressTransactions?.[0]?.txid,
    escrowAddress: paymentAddress,
    notes: notes,
    timeline: generateTimelineFromRealData(data),
    userRole,
  };

  return result;
}

// ============ Loading Skeleton ============

function OrderDetailSkeleton() {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton variant="text" width={60} height={20} />
        <Skeleton variant="text" width="40%" height={20} />
      </div>
      <div className="my-6 px-4">
        <Skeleton variant="rounded" width="100%" height={60} />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-3 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" width={32} height={32} />
              <div className="flex-1">
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="40%" height={12} className="mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-4 mt-4">
        <Skeleton variant="text" width={100} height={20} className="mb-4" />
        <div className="flex gap-4">
          <Skeleton variant="rectangular" width={80} height={80} className="rounded-lg" />
          <div className="flex-1">
            <Skeleton variant="text" width="70%" height={18} />
            <Skeleton variant="text" width="40%" height={14} className="mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Error State ============

function OrderDetailError({ error, onRetry }: { error: string; onRetry: () => void }) {
  const { t } = useI18n();

  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{t('order.loadOrderFailed')}</h3>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button onClick={onRetry} size="sm">
        {t('order.tryAgain')}
      </Button>
    </div>
  );
}

// ============ Main Component ============

export const OrderDetailModal = memo(function OrderDetailModal({
  orderId,
  open,
  onClose,
  onOrderUpdate,
  className,
}: OrderDetailModalProps) {
  const { t } = useI18n();
  const router = useRouter();

  // 获取当前用户信息
  const currentUser = useUserStore(state => state.profile);
  const currentUserPeerID = currentUser?.peerID || null;

  // 使用 hook 获取订单数据
  const {
    order: coreOrder,
    isLoading: orderLoading,
    error: orderError,
    refetch,
  } = useOrder(orderId || '');

  // 转换订单数据
  const displayOrder = useMemo(() => {
    if (!coreOrder) return null;
    return transformCoreOrder(coreOrder, currentUserPeerID);
  }, [coreOrder, currentUserPeerID]);

  // 处理订单更新
  const handleOrderUpdate = useCallback(() => {
    refetch();
    onOrderUpdate?.();
  }, [refetch, onOrderUpdate]);

  // 处理支付 - 跳转到支付页面
  const handlePay = useCallback(
    (payOrderId: string) => {
      // 关闭 Modal 并跳转到支付页面
      onClose();
      router.push(`/payment?orderID=${payOrderId}`);
    },
    [router, onClose]
  );

  // 处理关闭 - ESC 键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent
        className={cn('max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col', className)}
      >
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-semibold">
              {t('order.orderDetails')}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8">
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {orderLoading && <OrderDetailSkeleton />}

          {orderError && <OrderDetailError error={orderError} onRetry={refetch} />}

          {!orderLoading && !orderError && displayOrder && (
            <OrderDetailContent
              displayOrder={displayOrder}
              coreOrder={coreOrder}
              currentUserPeerID={currentUserPeerID}
              inModal={true}
              showFooter={false}
              refetch={refetch}
              onOrderUpdate={() => handleOrderUpdate()}
              onClose={onClose}
              onPay={handlePay}
            />
          )}

          {!orderLoading && !orderError && !displayOrder && (
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('order.orderNotFound')}
              </h3>
              <p className="text-sm text-muted-foreground">{t('order.orderNotFoundMessage')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default OrderDetailModal;
