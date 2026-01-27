'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useToast } from '@/components/ui/use-toast';
import {
  useOrder,
  getImageUrl,
  useUserStore,
  useI18n,
  isOrderFulfilled,
  ordersApi,
  formatTokenAmount,
  onWebSocketMessage,
  useWallet,
  getTransactionService,
  type OrderAction,
  type UserRole as CoreUserRole,
  type WebSocketMessage,
} from '@mobazha/core';
import type { Order as CoreOrder, OrderState } from '@mobazha/core';
import {
  OrderDetailContent,
  OrderFooter,
  FulfillOrderDialog,
  OrderConfirmDialog,
  type DisplayOrder,
  type OrderItem,
  type Moderator,
  type TimelineEvent,
  type OrderConfirmType,
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

  // 钱包连接 hook
  const { isConnected: walletConnected, walletInfo, getSigner, openModal } = useWallet();

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
  // 通用确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<OrderConfirmType | null>(null);
  // 发货对话框状态
  const [showFulfillDialog, setShowFulfillDialog] = useState(false);

  // 转换订单数据
  const displayOrder = useMemo(() => {
    if (!coreOrder) return null;
    return transformCoreOrder(coreOrder, currentUserPeerID);
  }, [coreOrder, currentUserPeerID]);

  // ============ WebSocket 订单实时更新监听 ============
  // 参考移动端和桌面端实现，监听 WebSocket 消息，当收到与当前订单相关的通知时自动刷新
  useEffect(() => {
    // 订阅 WebSocket 消息
    const unsubscribe = onWebSocketMessage((message: WebSocketMessage) => {
      // 检查消息是否包含通知
      const data = message.data as { notification?: { orderID?: string } } | undefined;
      const notification = data?.notification;

      if (notification?.orderID) {
        // 当收到匹配当前订单的通知时，自动刷新订单数据
        if (notification.orderID === orderId) {
          // 延迟刷新以确保后端状态已更新
          setTimeout(() => {
            refetch();
          }, 500);
        }
      }
    });

    // 清理：组件卸载时取消订阅
    return () => {
      unsubscribe();
    };
  }, [orderId, refetch]);

  // ============ 订单操作处理函数 ============

  // 通用确认对话框处理
  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog) return;

    const actionType = confirmDialog;
    setConfirmDialog(null);
    setIsActionLoading(true);

    try {
      let result: { success: boolean; error?: string };
      let successTitle: string;
      let successDesc: string;

      switch (actionType) {
        case 'accept':
          result = await ordersApi.confirmOrder({ orderID: orderId, reject: false });
          successTitle = t('order.actions.acceptSuccess');
          successDesc = t('order.actions.acceptSuccessDesc');
          break;
        case 'decline':
          result = await ordersApi.confirmOrder({ orderID: orderId, reject: true });
          successTitle = t('order.actions.declineSuccess');
          successDesc = t('order.actions.declineSuccessDesc');
          break;
        case 'cancel':
          result = await ordersApi.cancelOrder({ orderID: orderId });
          successTitle = t('order.actions.cancelSuccess');
          successDesc = t('order.actions.cancelSuccessDesc');
          break;
        case 'refund':
          result = await ordersApi.refundOrder({ orderID: orderId });
          successTitle = t('order.actions.refundSuccess');
          successDesc = t('order.actions.refundSuccessDesc');
          break;
        case 'claim':
          result = await ordersApi.claimPayment(orderId);
          successTitle = t('order.actions.claimSuccess');
          successDesc = t('order.actions.claimSuccessDesc');
          break;
        case 'acceptPayout':
          result = await ordersApi.acceptDispute(orderId);
          successTitle = t('order.actions.acceptPayoutSuccess');
          successDesc = t('order.actions.acceptPayoutSuccessDesc');
          break;
        case 'complete': {
          // 完成订单（买家确认收货）
          // 参考桌面端和移动端实现，需要先检查是否需要链上交易

          // 获取订单中的商品列表
          const orderData = coreOrder as RealOrderData | null;
          const listings = orderData?.contract?.orderOpen?.listings || [];

          // 为每个商品创建默认评分（5星）
          // 后续可以扩展为让用户填写评分表单
          const ratings = listings.map(listingItem => ({
            slug: listingItem.listing?.slug || '',
            overall: 5,
            quality: 5,
            description: 5,
            deliverySpeed: 5,
            customerService: 5,
            review: '',
          }));

          let txID: string | undefined;

          // 获取当前用户钱包地址
          // 注意：必须先连接钱包获取地址，否则 instructions API 会返回包含零地址的数据
          let initiatorAddress = walletInfo?.address || '';

          // 如果钱包未连接，先提示用户连接钱包
          if (!walletConnected || !walletInfo || !initiatorAddress) {
            toast({
              title: t('order.actions.walletRequired'),
              description: t('order.actions.pleaseConnectWallet'),
            });
            // 打开钱包连接弹窗
            await openModal({ view: 'Connect' });
            // 检查连接后的钱包信息（需要用户重新点击确认收货按钮）
            throw new Error(t('order.actions.walletConnectionCancelled'));
          }

          // 确保有钱包地址（此时 walletInfo 一定不为 null）
          initiatorAddress = walletInfo.address;

          // 1. 先调用 instructions API 检查是否需要链上交易
          const instructionsResponse = await ordersApi.getCompleteInstructions({
            orderID: orderId,
            initiatorAddress,
          });

          if (instructionsResponse.hasInstructions && instructionsResponse.instructions) {
            // 需要链上交易
            // 获取 signer 并初始化交易服务
            const signer = await getSigner();
            if (!signer) {
              throw new Error(t('order.actions.walletSignerError'));
            }

            const transactionService = getTransactionService();
            const initResult = await transactionService.initializeWithSigner(signer);
            if (!initResult) {
              throw new Error(t('order.actions.transactionServiceError'));
            }

            // 执行链上交易
            // instructions 格式: { to: string, data: string, value?: string }
            const instructions = instructionsResponse.instructions as {
              to: string;
              data: string;
              value?: string;
            };

            // 验证 instructions 数据
            if (!instructions.to || !instructions.data) {
              console.error('Invalid instructions data:', instructions);
              throw new Error(t('order.actions.invalidInstructions'));
            }

            toast({
              title: t('order.actions.signingTransaction'),
              description: t('order.actions.pleaseConfirmInWallet'),
            });

            const txResult = await transactionService.executeTransaction({
              to: instructions.to,
              data: instructions.data,
              value: instructions.value || '0',
            });

            if (!txResult.success || !txResult.transactionHash) {
              // 检查是否是零地址错误
              const errorMsg = txResult.error || '';
              if (errorMsg.includes('zero address')) {
                throw new Error(t('order.actions.zeroAddressError'));
              }
              throw new Error(errorMsg || t('order.actions.transactionFailed'));
            }

            txID = txResult.transactionHash;
          }

          // 2. 调用 completeOrder API
          result = await ordersApi.completeOrder({
            orderID: orderId,
            txID,
            ratings,
            anonymous: false,
          });
          successTitle = t('order.actions.completeSuccess');
          successDesc = t('order.actions.completeSuccessDesc');
          break;
        }
        default:
          return;
      }

      if (result.success) {
        toast({ title: successTitle, description: successDesc });
        // 延迟刷新以确保后端状态已更新
        setTimeout(() => {
          refetch();
        }, 500);
      } else {
        throw new Error(result.error || `Failed to ${actionType} order`);
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
  }, [
    confirmDialog,
    coreOrder,
    getSigner,
    openModal,
    orderId,
    refetch,
    t,
    toast,
    walletConnected,
    walletInfo,
  ]);

  // 统一处理订单操作（用于 OrderFooter）
  const handleOrderAction = useCallback(
    (action: OrderAction) => {
      switch (action) {
        case 'Pay':
          router.push(`/payment?orderID=${orderId}`);
          break;
        case 'Cancel':
          setConfirmDialog('cancel');
          break;
        case 'Dispute':
          // 将在 OrderDetailContent 中处理
          break;
        case 'Complete':
          setConfirmDialog('complete');
          break;
        case 'WriteReview':
          toast({
            title: t('common.comingSoon'),
            description: t('order.actions.reviewComingSoon'),
          });
          break;
        case 'Accept':
          setConfirmDialog('accept');
          break;
        case 'Decline':
          setConfirmDialog('decline');
          break;
        case 'Fulfill':
          setShowFulfillDialog(true);
          break;
        case 'Refund':
          setConfirmDialog('refund');
          break;
        case 'Claim':
          setConfirmDialog('claim');
          break;
        case 'AcceptPayout':
          setConfirmDialog('acceptPayout');
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
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {t('order.seller')}
                </h3>
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
                    <span className="text-xs text-muted-foreground">{t('order.viewStore')}</span>
                  </VStack>
                </HStack>
              </Card>

              {/* Buyer Info */}
              {displayOrder.buyer && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {t('order.buyer')}
                  </h3>
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
                      <span className="text-xs text-muted-foreground">{t('order.buyer')}</span>
                    </VStack>
                  </HStack>
                </Card>
              )}

              {/* Moderator Info */}
              {displayOrder.moderator && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {t('order.moderator')}
                  </h3>
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
                        {t('order.moderatorFeePercent', { fee: displayOrder.moderator.fee })}
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

      {/* ============ 订单操作对话框 ============ */}

      {/* 通用确认对话框 */}
      {confirmDialog && (
        <OrderConfirmDialog
          open={!!confirmDialog}
          onOpenChange={open => !open && setConfirmDialog(null)}
          type={confirmDialog}
          onConfirm={handleConfirmAction}
          isLoading={isActionLoading}
        />
      )}

      {/* 发货对话框 */}
      <FulfillOrderDialog
        open={showFulfillDialog}
        onOpenChange={setShowFulfillDialog}
        orderId={orderId}
        onSuccess={refetch}
      />

      <Footer />
    </div>
  );
}
