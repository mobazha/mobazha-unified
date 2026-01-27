'use client';

import React, { useMemo, useCallback, useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import {
  useOrder,
  getImageUrl,
  useUserStore,
  useI18n,
  isOrderFulfilled,
  ordersApi,
  formatTokenAmount,
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
// 参考桌面端逻辑：PENDING 表示已支付等待确认，AWAITING_PAYMENT 才是未支付
function mapOrderState(state: OrderState): DisplayOrder['status'] {
  const stateMap: Record<string, DisplayOrder['status']> = {
    // PENDING 表示订单已创建且已支付，等待卖家确认（参考桌面端）
    PENDING: 'paid',
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
    // PAYMENT_FINALIZED: 托管已释放（超时后），等待买家评价后变成 COMPLETE
    // 参考移动端/桌面端，此状态表示交易已完成，与 COMPLETED 同级
    PAYMENT_FINALIZED: 'completed',
    PROCESSING_ERROR: 'awaiting_payment',
  };
  return stateMap[state] || 'awaiting_payment';
}

// 格式化价格金额（使用统一的 token 配置）
function formatPriceAmount(amount: number, divisibility: number = 2, coin?: string): string {
  // 如果提供了 coin，使用统一配置中的 decimals
  if (coin) {
    return formatTokenAmount(amount, coin);
  }
  // 否则使用传入的 divisibility
  const normalAmount = amount / Math.pow(10, divisibility);
  const displayDecimals = divisibility >= 6 ? 2 : Math.min(divisibility, 8);
  return normalAmount.toFixed(displayDecimals);
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
    // PaymentSent 统一消息：method 表示支付模式
    // 0=DIRECT, 1=CANCELABLE, 2=MODERATED, 3=RWA_ESCROW（托管）, 4=RWA_INSTANT（即时）
    paymentSent?: {
      transactionID?: string;
      moderator?: string;
      coin?: string;
      amount?: number;
      method?: number | string;
      address?: string;
      contractAddress?: string; // UniversalSwap 合约地址（RWA 模式）
      buyerReceiveAddress?: string;
      paymentTokenAddress?: string;
      timestamp?: string;
    };
    // 已废弃：保留用于兼容旧数据
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
    disputeClose?: {
      timestamp?: string;
      verdict?: string;
    };
  };
}

// 根据实际订单数据生成时间线
function generateTimelineFromRealData(data: RealOrderData): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];
  const contract = data.contract;

  const orderOpen = contract.orderOpen;
  const orderTimestamp = orderOpen?.timestamp;

  // 订单创建
  if (orderTimestamp) {
    timeline.push({
      status: 'created',
      timestamp: orderTimestamp,
      description: 'Order placed',
      actor: 'buyer',
    });
  }

  // 资金到账 (使用 PaymentSent 统一消息)
  if (
    data.funded ||
    contract.paymentSent ||
    (data.paymentAddressTransactions && data.paymentAddressTransactions.length > 0)
  ) {
    const confirmTimestamp = contract.orderConfirmation?.timestamp || orderTimestamp || '';
    timeline.push({
      status: 'paid',
      timestamp: confirmTimestamp,
      description: 'Payment confirmed',
      actor: 'system',
    });
  }

  // 卖家确认
  const orderConfirmation = contract.orderConfirmation;
  if (orderConfirmation) {
    timeline.push({
      status: 'processing',
      timestamp: orderConfirmation.timestamp || '',
      description: 'Vendor confirmed order',
      actor: 'seller',
    });
  }

  // 发货
  const fulfillments = contract.orderFulfillments;
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
  const orderComplete = contract.orderComplete;
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

  // 争议关闭
  if (contract.disputeClose) {
    timeline.push({
      status: 'resolved',
      timestamp: contract.disputeClose.timestamp || '',
      description: `Dispute closed: ${contract.disputeClose.verdict || 'N/A'}`,
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
  }

  const buyerPeerID = orderOpen?.buyerID?.peerID || '';
  const buyerHandle = orderOpen?.buyerID?.handle || '';

  // 支持 PaymentSent (统一消息)
  const paymentSent = contract.paymentSent;
  // 判断是否为 RWA 托管模式：method === 3 (RWA_ESCROW)
  const isRwaEscrow =
    paymentSent?.method === 3 ||
    paymentSent?.method === 'RWA_ESCROW' ||
    paymentSent?.method === 'RWA_LOCKED';
  // 判断是否为 RWA 即时模式：method === 4 (RWA_INSTANT)
  const isRwaInstant = paymentSent?.method === 4 || paymentSent?.method === 'RWA_INSTANT';
  const coin = paymentSent?.coin || orderOpen?.pricingCoin || 'ETH';
  // 使用显式的 !== undefined 检查，避免 "0" 被当作 falsy 值处理
  const amount =
    paymentSent?.amount !== undefined
      ? paymentSent.amount
      : orderOpen?.amount !== undefined
        ? orderOpen.amount
        : (listingData?.item?.price ?? 0);
  const paymentMethod = paymentSent?.method || '';
  const moderatorId = paymentSent?.moderator || '';

  const divisibility = listingData?.metadata?.pricingCurrency?.divisibility || 2;
  const timestamp = orderOpen?.timestamp || '';
  const fulfillments = contract.orderFulfillments;
  const trackingInfo = fulfillments?.[0]?.physicalDelivery?.[0];
  const shipping = orderOpen?.shipping;

  const paymentAddress = paymentSent?.address || contract.orderConfirmation?.paymentAddress;

  const notes = orderOpen?.alternateContactInfo;
  const orderOpenItems = orderOpen?.items || [];

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
          price: formatPriceAmount(itemPrice, divisibility, coin),
          currency: coin,
        }))
      : [
          {
            id: 'item-0',
            title: itemTitle,
            image: itemImageUrl,
            quantity: 1,
            price: formatPriceAmount(itemPrice, divisibility, coin),
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
    total: formatPriceAmount(amount, divisibility, coin),
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
    // 支持 RWA 模式和传统交易
    paymentTx: paymentSent?.transactionID || data.paymentAddressTransactions?.[0]?.txid,
    // RWA 即时交易标识（即时交易已在链上完成，无需等待）
    isRwaInstant: isRwaInstant,
    // RWA 支付锁定信息（从 paymentSent 获取，仅用于托管模式）
    paymentLocked:
      isRwaEscrow && paymentSent
        ? (() => {
            // 从 listing metadata 获取 escrowTimeoutSeconds
            const metadata = listingData?.metadata as Record<string, unknown> | undefined;
            const escrowTimeoutSeconds = (metadata?.rwaEscrowTimeoutSeconds ||
              metadata?.escrowTimeoutSeconds ||
              900) as number; // 默认 15 分钟

            // 计算过期时间
            let expiresAt: string | undefined;
            if (paymentSent.timestamp) {
              const lockedTime = new Date(paymentSent.timestamp).getTime();
              expiresAt = new Date(lockedTime + escrowTimeoutSeconds * 1000).toISOString();
            }

            return {
              amount: String(paymentSent.amount || ''),
              coin: paymentSent.coin || '',
              buyerReceiveAddress: paymentSent.buyerReceiveAddress || '',
              lockTxHash: paymentSent.transactionID || '',
              timestamp: paymentSent.timestamp,
              escrowTimeoutSeconds,
              expiresAt,
            };
          })()
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
  const { toast } = useToast();
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

  // 订单操作状态
  const [isActionLoading, setIsActionLoading] = useState(false);
  // 确认对话框状态
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [showAcceptPayoutDialog, setShowAcceptPayoutDialog] = useState(false);

  // 转换订单数据
  const displayOrder = useMemo(() => {
    if (!coreOrder) return null;
    return transformCoreOrder(coreOrder, currentUserPeerID);
  }, [coreOrder, currentUserPeerID]);

  // ============ 订单操作处理函数 ============

  // 接受订单（卖家）
  const handleAcceptOrder = useCallback(async () => {
    setShowAcceptDialog(false);
    setIsActionLoading(true);
    try {
      const result = await ordersApi.confirmOrder({
        orderID: orderId,
        reject: false,
      });
      if (result.success) {
        toast({
          title: t('order.actions.acceptSuccess'),
          description: t('order.actions.acceptSuccessDesc'),
        });
        refetch();
      } else {
        throw new Error(result.error || 'Failed to accept order');
      }
    } catch (error) {
      toast({
        title: t('order.actions.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [orderId, refetch, t, toast]);

  // 拒绝订单（卖家）
  const handleDeclineOrder = useCallback(async () => {
    setShowDeclineDialog(false);
    setIsActionLoading(true);
    try {
      const result = await ordersApi.confirmOrder({
        orderID: orderId,
        reject: true,
      });
      if (result.success) {
        toast({
          title: t('order.actions.declineSuccess'),
          description: t('order.actions.declineSuccessDesc'),
        });
        refetch();
      } else {
        throw new Error(result.error || 'Failed to decline order');
      }
    } catch (error) {
      toast({
        title: t('order.actions.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [orderId, refetch, t, toast]);

  // 取消订单
  const handleCancelOrder = useCallback(async () => {
    setShowCancelDialog(false);
    setIsActionLoading(true);
    try {
      const result = await ordersApi.cancelOrder({ orderID: orderId });
      if (result.success) {
        toast({
          title: t('order.actions.cancelSuccess'),
          description: t('order.actions.cancelSuccessDesc'),
        });
        refetch();
      } else {
        throw new Error(result.error || 'Failed to cancel order');
      }
    } catch (error) {
      toast({
        title: t('order.actions.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [orderId, refetch, t, toast]);

  // 退款订单（卖家）
  const handleRefundOrder = useCallback(async () => {
    setShowRefundDialog(false);
    setIsActionLoading(true);
    try {
      const result = await ordersApi.refundOrder({ orderID: orderId });
      if (result.success) {
        toast({
          title: t('order.actions.refundSuccess'),
          description: t('order.actions.refundSuccessDesc'),
        });
        refetch();
      } else {
        throw new Error(result.error || 'Failed to refund order');
      }
    } catch (error) {
      toast({
        title: t('order.actions.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [orderId, refetch, t, toast]);

  // 认领过期资金（卖家）
  const handleClaimPayment = useCallback(async () => {
    setShowClaimDialog(false);
    setIsActionLoading(true);
    try {
      const result = await ordersApi.claimPayment(orderId);
      if (result.success) {
        toast({
          title: t('order.actions.claimSuccess'),
          description: t('order.actions.claimSuccessDesc'),
        });
        refetch();
      } else {
        throw new Error(result.error || 'Failed to claim payment');
      }
    } catch (error) {
      toast({
        title: t('order.actions.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [orderId, refetch, t, toast]);

  // 接受争议裁决
  const handleAcceptPayout = useCallback(async () => {
    setShowAcceptPayoutDialog(false);
    setIsActionLoading(true);
    try {
      const result = await ordersApi.acceptDispute(orderId);
      if (result.success) {
        toast({
          title: t('order.actions.acceptPayoutSuccess'),
          description: t('order.actions.acceptPayoutSuccessDesc'),
        });
        refetch();
      } else {
        throw new Error(result.error || 'Failed to accept payout');
      }
    } catch (error) {
      toast({
        title: t('order.actions.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [orderId, refetch, t, toast]);

  // 统一处理订单操作（用于 OrderFooter）
  const handleOrderAction = useCallback(
    (action: OrderAction) => {
      switch (action) {
        case 'Pay':
          // 跳转到支付页面
          router.push(`/payment?orderID=${orderId}`);
          break;
        case 'Cancel':
          setShowCancelDialog(true);
          break;
        case 'Dispute':
          // 将在 OrderDetailContent 中处理
          break;
        case 'Complete':
          // 将在 OrderDetailContent 中处理
          break;
        case 'WriteReview':
          toast({
            title: t('common.comingSoon'),
            description: t('order.actions.reviewComingSoon'),
          });
          break;
        case 'Accept':
          setShowAcceptDialog(true);
          break;
        case 'Decline':
          setShowDeclineDialog(true);
          break;
        case 'Fulfill':
          // 将在 OrderDetailContent 中处理
          break;
        case 'Refund':
          setShowRefundDialog(true);
          break;
        case 'Claim':
          setShowClaimDialog(true);
          break;
        case 'AcceptPayout':
          setShowAcceptPayoutDialog(true);
          break;
      }
    },
    [router, orderId, t, toast]
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
        paymentMethod={coreOrder?.contract?.paymentSent?.method?.toString()}
        totalAmount={displayOrder.total}
        currency={displayOrder.currency}
        paymentCoin={coreOrder?.contract?.paymentSent?.coin}
        onAction={handleOrderAction}
      />

      {/* ============ 订单操作确认对话框 ============ */}

      {/* 接受订单对话框 */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order.dialogs.acceptOrder.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('order.dialogs.acceptOrder.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptOrder} disabled={isActionLoading}>
              {isActionLoading ? t('common.processing') : t('order.actions.accept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 拒绝订单对话框 */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order.dialogs.declineOrder.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('order.dialogs.declineOrder.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeclineOrder}
              disabled={isActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isActionLoading ? t('common.processing') : t('order.actions.decline')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 取消订单对话框 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order.dialogs.cancelOrder.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('order.dialogs.cancelOrder.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={isActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isActionLoading ? t('common.processing') : t('order.actions.cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 退款订单对话框 */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order.dialogs.refundOrder.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('order.dialogs.refundOrder.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefundOrder} disabled={isActionLoading}>
              {isActionLoading ? t('common.processing') : t('order.actions.refund')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 认领过期资金对话框 */}
      <AlertDialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order.dialogs.claimPayment.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('order.dialogs.claimPayment.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClaimPayment} disabled={isActionLoading}>
              {isActionLoading ? t('common.processing') : t('order.actions.claim')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 接受争议裁决对话框 */}
      <AlertDialog open={showAcceptPayoutDialog} onOpenChange={setShowAcceptPayoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order.dialogs.acceptPayout.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('order.dialogs.acceptPayout.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptPayout} disabled={isActionLoading}>
              {isActionLoading ? t('common.processing') : t('order.actions.acceptPayout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
