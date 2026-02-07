'use client';

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOrderDetail,
  useUserStore,
  useI18n,
  isOrderFulfilled,
  ordersApi,
  onWebSocketMessage,
  useOrderAction,
  type OrderAction,
  type UserRole as CoreUserRole,
  type WebSocketMessage,
} from '@mobazha/core';
import {
  OrderDetailContent,
  OrderFooter,
  OrderChat,
  AcceptOrderDialog,
  FulfillOrderDialog,
  OrderConfirmDialog,
  type OrderConfirmType,
  type OrderChatMessage,
  type OrderChatParticipant,
} from '@/components/Order';

// 用于类型安全地访问订单合约数据的接口
interface OrderContractData {
  contract?: {
    orderOpen?: {
      listings?: Array<{
        listing?: {
          slug?: string;
          metadata?: { contractType?: string };
          item?: { blockchain?: string };
        };
      }>;
    };
    paymentSent?: {
      coin?: string;
    };
  };
}

// ============ Main Component ============

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { toast } = useToast();
  const orderId = params.orderId as string;
  // 从 URL 参数获取订单类型（sale 或 purchase），用于后备判断用户角色
  const typeFromUrl = searchParams.get('type');
  const viewingContext =
    typeFromUrl === 'sale' ? 'sale' : typeFromUrl === 'purchase' ? 'purchase' : undefined;

  // 使用统一的 useOrderDetail hook 获取和转换订单数据
  const {
    displayOrder,
    coreOrder,
    isLoading: orderLoading,
    error: orderError,
    refetch,
  } = useOrderDetail(orderId, viewingContext);

  // 获取当前用户信息（用于传递给 OrderDetailContent）
  const currentUser = useUserStore(state => state.profile);
  const currentUserPeerID = currentUser?.peerID || null;

  // 订单操作状态
  const [isActionLoading, setIsActionLoading] = useState(false);
  // 通用确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<OrderConfirmType | null>(null);
  // 接受订单对话框状态
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  // 发货对话框状态
  const [showFulfillDialog, setShowFulfillDialog] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  // 合约数据模态框状态
  const [showContractModal, setShowContractModal] = useState(false);

  const displayOrderId = displayOrder?.orderId ?? '';

  const handleCopyOrderId = useCallback(async () => {
    if (!displayOrderId) {
      toast({ title: t('order.actions.orderIdUnavailable') });
      return;
    }
    try {
      await navigator.clipboard.writeText(displayOrderId);
      toast({ title: t('order.actions.orderIdCopied') });
    } catch {
      toast({
        title: t('order.actions.copyFailed'),
        description: t('order.actions.copyOrderIdManually'),
      });
    }
  }, [displayOrderId, toast, t]);

  // 查看交易合约 - 显示订单合约数据（JSON格式），与原移动端一致
  const handleViewContract = useCallback(() => {
    if (!coreOrder) {
      toast({ title: t('order.actions.orderDataUnavailable') });
      return;
    }
    setShowContractModal(true);
  }, [coreOrder, toast, t]);

  // 复制合约数据到剪贴板
  const handleCopyContract = useCallback(async () => {
    if (!coreOrder) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(coreOrder, null, 2));
      toast({ title: t('order.actions.contractCopied') });
    } catch {
      toast({ title: t('order.actions.copyFailed') });
    }
  }, [coreOrder, toast, t]);

  // ============ 移动端 Tab 状态 ============
  const [activeTab, setActiveTab] = useState<'details' | 'discussion'>('details');

  // ============ 聊天相关状态（模拟数据，实际需接入 Matrix） ============
  const [chatMessages, setChatMessages] = useState<OrderChatMessage[]>([]);

  // 构建聊天参与者列表
  const chatParticipants = useMemo<OrderChatParticipant[]>(() => {
    if (!displayOrder) return [];
    const participants: OrderChatParticipant[] = [];

    if (displayOrder.vendor) {
      participants.push({
        id: displayOrder.vendor.peerID || 'vendor',
        peerID: displayOrder.vendor.peerID || '',
        name: displayOrder.vendor.name || 'Seller',
        avatar: displayOrder.vendor.avatar,
        role: 'seller',
      });
    }

    if (displayOrder.buyer) {
      participants.push({
        id: displayOrder.buyer.peerID || 'buyer',
        peerID: displayOrder.buyer.peerID || '',
        name: displayOrder.buyer.name || 'Buyer',
        avatar: displayOrder.buyer.avatar,
        role: 'buyer',
      });
    }

    if (displayOrder.moderator) {
      participants.push({
        id: displayOrder.moderator.id || 'moderator',
        peerID: displayOrder.moderator.id || '',
        name: displayOrder.moderator.name || 'Moderator',
        avatar: displayOrder.moderator.avatar,
        role: 'moderator',
      });
    }

    return participants;
  }, [displayOrder]);

  // 发送消息处理（模拟）
  const handleSendMessage = useCallback(
    async (content: string) => {
      const newMessage: OrderChatMessage = {
        id: `msg-${Date.now()}`,
        content,
        senderId: currentUserPeerID || 'unknown',
        timestamp: new Date().toISOString(),
        status: 'sent',
      };
      setChatMessages(prev => [...prev, newMessage]);
    },
    [currentUserPeerID]
  );

  // 获取交易对方信息（移动端顶部显示）
  const counterparty = useMemo(() => {
    if (!displayOrder) return null;
    return displayOrder.userRole === 'buyer' ? displayOrder.vendor : displayOrder.buyer;
  }, [displayOrder]);

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

  // 使用统一的订单操作 hook
  const { execute: executeOrderAction } = useOrderAction();

  // 获取支付币种 - 从 displayOrder 或 coreOrder 获取
  const paymentCoin =
    displayOrder?.paymentCoin || (coreOrder as OrderContractData)?.contract?.paymentSent?.coin;

  // 通用确认对话框处理
  // 使用统一的 useOrderAction hook 处理所有订单操作
  // - UTXO 链（BTC/LTC/BCH/ZEC）：直接调用 API
  // - EVM/Solana 链：先获取 instructions，如需要则执行链上交易
  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog) return;

    const actionType = confirmDialog;
    setConfirmDialog(null);
    setIsActionLoading(true);

    // 成功回调
    const onSuccess = (title: string, desc: string) => {
      toast({ title, description: desc });
      setTimeout(() => {
        refetch();
      }, 500);
    };

    // 错误回调
    const onError = (error: Error) => {
      toast({
        title: t('order.actions.error'),
        description: error.message,
        variant: 'destructive',
      });
    };

    try {
      switch (actionType) {
        case 'decline':
          // 拒绝订单：EVM/Solana 链可能需要链上交易退款
          await executeOrderAction({
            paymentCoin,
            getInstructions: initiatorAddress =>
              ordersApi.getConfirmInstructions({
                orderID: orderId,
                reject: true,
                initiatorAddress,
              }),
            executeAction: txID =>
              ordersApi.confirmOrder({
                orderID: orderId,
                reject: true,
                transactionID: txID,
              }),
            onSuccess: () =>
              onSuccess(t('order.actions.declineSuccess'), t('order.actions.declineSuccessDesc')),
            onError,
          });
          break;

        case 'cancel':
          // 取消订单：EVM/Solana 链可能需要链上交易退款
          await executeOrderAction({
            paymentCoin,
            getInstructions: initiatorAddress =>
              ordersApi.getCancelInstructions({
                orderID: orderId,
                initiatorAddress,
              }),
            executeAction: txID =>
              ordersApi.cancelOrder({
                orderID: orderId,
                transactionID: txID,
              }),
            onSuccess: () =>
              onSuccess(t('order.actions.cancelSuccess'), t('order.actions.cancelSuccessDesc')),
            onError,
          });
          break;

        case 'refund':
          // 退款订单：EVM/Solana 链可能需要链上交易
          await executeOrderAction({
            paymentCoin,
            getInstructions: initiatorAddress =>
              ordersApi.getRefundInstructions({
                orderID: orderId,
                initiatorAddress,
              }),
            executeAction: txID =>
              ordersApi.refundOrder({
                orderID: orderId,
                transactionID: txID,
              }),
            onSuccess: () =>
              onSuccess(t('order.actions.refundSuccess'), t('order.actions.refundSuccessDesc')),
            onError,
          });
          break;

        case 'claim':
          // 认领过期资金：不需要链上交易指令（后端直接处理）
          await executeOrderAction({
            paymentCoin,
            executeAction: () => ordersApi.claimPayment(orderId),
            onSuccess: () =>
              onSuccess(t('order.actions.claimSuccess'), t('order.actions.claimSuccessDesc')),
            onError,
          });
          break;

        case 'acceptPayout':
          // 接受争议裁决：不需要链上交易指令（后端直接处理）
          await executeOrderAction({
            paymentCoin,
            executeAction: () => ordersApi.acceptDispute(orderId),
            onSuccess: () =>
              onSuccess(
                t('order.actions.acceptPayoutSuccess'),
                t('order.actions.acceptPayoutSuccessDesc')
              ),
            onError,
          });
          break;

        case 'complete': {
          // 完成订单（买家确认收货）：EVM/Solana 链可能需要链上交易
          const orderData = coreOrder as OrderContractData | null;
          const listings = orderData?.contract?.orderOpen?.listings || [];

          // 为每个商品创建默认评分（5星）
          const ratings = listings.map((listingItem: { listing?: { slug?: string } }) => ({
            slug: listingItem.listing?.slug || '',
            overall: 5,
            quality: 5,
            description: 5,
            deliverySpeed: 5,
            customerService: 5,
            review: '',
          }));

          await executeOrderAction({
            paymentCoin,
            getInstructions: initiatorAddress =>
              ordersApi.getCompleteInstructions({
                orderID: orderId,
                initiatorAddress,
              }),
            executeAction: txID =>
              ordersApi.completeOrder({
                orderID: orderId,
                txID,
                ratings,
                anonymous: false,
              }),
            onSuccess: () =>
              onSuccess(t('order.actions.completeSuccess'), t('order.actions.completeSuccessDesc')),
            onError,
          });
          break;
        }

        default:
          return;
      }
    } catch {
      // Error already handled by onError callback
    } finally {
      setIsActionLoading(false);
    }
  }, [confirmDialog, coreOrder, executeOrderAction, orderId, paymentCoin, refetch, t, toast]);

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
          // 接受订单需要选择收款账户，使用专门的对话框
          setShowAcceptDialog(true);
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
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-error/15 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-error"
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
          {/* ============ 移动端：顶部导航 + Tab ============ */}
          <div className="lg:hidden">
            {/* 顶部：返回按钮 + 订单号 + 更多操作 */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                Order #{displayOrder.orderId.slice(0, 8)}...
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowMobileMenu(prev => !prev)}
                  className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="More actions"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
            </div>
            {/* ActionSheet 风格菜单 */}
            {showMobileMenu && (
              <div className="fixed inset-0 z-[60]">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setShowMobileMenu(false)}
                />
                <div className="absolute left-0 right-0 bottom-0 bg-background rounded-t-2xl shadow-xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-auto">
                  <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
                  <div className="space-y-1">
                    {counterparty?.peerID && (
                      <button
                        onClick={() => {
                          setShowMobileMenu(false);
                          router.push(`/store/${counterparty.peerID}`);
                        }}
                        className="w-full py-4 text-center text-[15px] font-medium hover:bg-muted/20 rounded-lg transition-colors"
                      >
                        {t('order.actions.goToSellerPage')}
                      </button>
                    )}
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        setShowMobileMenu(false);
                        await handleCopyOrderId();
                      }}
                      className="w-full py-4 text-center text-[15px] font-medium hover:bg-muted/20 rounded-lg transition-colors"
                    >
                      {t('order.actions.copyOrderId')}
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowMobileMenu(false);
                        handleViewContract();
                      }}
                      className="w-full py-4 text-center text-[15px] font-medium hover:bg-muted/20 rounded-lg transition-colors"
                    >
                      {t('order.actions.viewContract')}
                    </button>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/60">
                    <button
                      onClick={() => setShowMobileMenu(false)}
                      className="w-full py-4 text-center text-[15px] font-medium text-primary hover:bg-muted/20 rounded-lg transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 导航（置顶吸附） */}
            <div className="sticky top-0 z-20 bg-background border-b border-border mb-4">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('details')}
                  className={cn(
                    'flex-1 py-2.5 text-sm font-medium text-center transition-colors relative',
                    activeTab === 'details'
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t('order.tabs.summary')}
                  {activeTab === 'details' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('discussion')}
                  className={cn(
                    'flex-1 py-2.5 text-sm font-medium text-center transition-colors relative flex items-center justify-center gap-1.5',
                    activeTab === 'discussion'
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  {t('order.tabs.discussion')}
                  {activeTab === 'discussion' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </div>
            </div>

            {/* Tab 内容 */}
            {activeTab === 'details' ? (
              <Card className="mb-4 p-2.5 border border-border/60 shadow-sm overflow-hidden">
                <OrderDetailContent
                  displayOrder={displayOrder}
                  coreOrder={coreOrder}
                  currentUserPeerID={currentUserPeerID}
                  inModal={false}
                  showFooter={false}
                  refetch={refetch}
                  onOpenDispute={() => handleOrderAction('Dispute')}
                />
              </Card>
            ) : (
              <Card className="mb-4 border border-border/60 shadow-sm overflow-hidden">
                <OrderChat
                  orderId={orderId}
                  participants={chatParticipants}
                  messages={chatMessages}
                  currentUserId={currentUserPeerID || ''}
                  onSendMessage={handleSendMessage}
                  className="h-[calc(100vh-320px)] min-h-[400px]"
                />
              </Card>
            )}
          </div>

          {/* ============ 桌面端：原有布局 ============ */}
          <div className="hidden lg:block">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 text-sm touch-feedback transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </div>
              {t('order.backToOrders')}
            </button>

            {/* Order Detail Content */}
            <Card className="mb-4 sm:mb-6 p-6 border border-border/60 shadow-sm overflow-hidden">
              <OrderDetailContent
                displayOrder={displayOrder}
                coreOrder={coreOrder}
                currentUserPeerID={currentUserPeerID}
                inModal={false}
                showFooter={false}
                refetch={refetch}
                onOpenDispute={() => handleOrderAction('Dispute')}
              />
            </Card>
          </div>

          {/* Desktop: Participants Info - Hidden on mobile */}
          <div className="hidden lg:grid grid-cols-3 gap-4 mt-6">
            {/* Seller Info */}
            <Link
              href={displayOrder.vendor?.peerID ? `/store/${displayOrder.vendor.peerID}` : '#'}
              className="group"
            >
              <Card className="p-4 border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {t('order.seller')}
                </h3>
                <HStack gap="sm" align="center">
                  <Avatar
                    src={displayOrder.vendor.avatar}
                    name={displayOrder.vendor.name}
                    size="md"
                    className="w-11 h-11 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
                  />
                  <VStack gap="none">
                    <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                      {displayOrder.vendor.name}
                    </span>
                    {displayOrder.vendor.location && (
                      <span className="text-xs text-muted-foreground">
                        {displayOrder.vendor.location}
                      </span>
                    )}
                  </VStack>
                </HStack>
              </Card>
            </Link>

            {/* Buyer Info */}
            {displayOrder.buyer && (
              <Link
                href={displayOrder.buyer?.peerID ? `/store/${displayOrder.buyer.peerID}` : '#'}
                className="group"
              >
                <Card className="p-4 border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t('order.buyer')}
                  </h3>
                  <HStack gap="sm" align="center">
                    <Avatar
                      src={displayOrder.buyer.avatar}
                      name={displayOrder.buyer.name}
                      size="md"
                      className="w-11 h-11 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
                    />
                    <VStack gap="none">
                      <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {displayOrder.buyer.name}
                      </span>
                      {displayOrder.buyer.location && (
                        <span className="text-xs text-muted-foreground">
                          {displayOrder.buyer.location}
                        </span>
                      )}
                    </VStack>
                  </HStack>
                </Card>
              </Link>
            )}

            {/* Moderator Info */}
            {displayOrder.moderator && (
              <Link href={`/moderators/${displayOrder.moderator.id}`} className="group">
                <Card className="p-4 border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t('order.moderator')}
                  </h3>
                  <HStack gap="sm" align="center">
                    <Avatar
                      src={displayOrder.moderator.avatar}
                      name={displayOrder.moderator.name}
                      size="md"
                      className="w-11 h-11 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
                    />
                    <VStack gap="none">
                      <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {displayOrder.moderator.name}
                      </span>
                      <span className="text-xs text-primary font-medium">
                        {t('order.moderatorFeePercent', { fee: displayOrder.moderator.fee })}
                      </span>
                    </VStack>
                  </HStack>
                </Card>
              </Link>
            )}
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

      {/* 接受订单对话框 */}
      <AcceptOrderDialog
        open={showAcceptDialog}
        onOpenChange={setShowAcceptDialog}
        orderId={orderId}
        blockchain={
          (coreOrder as OrderContractData)?.contract?.orderOpen?.listings?.[0]?.listing?.item
            ?.blockchain as string | undefined
        }
        paymentCoin={(coreOrder as OrderContractData)?.contract?.paymentSent?.coin}
        onSuccess={refetch}
      />

      {/* 发货对话框 */}
      <FulfillOrderDialog
        open={showFulfillDialog}
        onOpenChange={setShowFulfillDialog}
        orderId={orderId}
        contractType={
          (coreOrder as OrderContractData)?.contract?.orderOpen?.listings?.[0]?.listing?.metadata
            ?.contractType
        }
        blockchain={
          (coreOrder as OrderContractData)?.contract?.orderOpen?.listings?.[0]?.listing?.item
            ?.blockchain as string | undefined
        }
        onSuccess={refetch}
      />

      {/* 合约数据模态框 - 与原移动端 ContractModal 一致 */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[85vh] sm:max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="text-base font-semibold text-center">
              {t('order.actions.viewContract')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-background px-2 py-2.5">
            <pre className="text-[12px] leading-[18px] font-mono text-foreground whitespace-pre-wrap break-all px-2">
              {coreOrder ? JSON.stringify(coreOrder, null, 2) : t('common.noData')}
            </pre>
          </div>
          <div className="px-4 py-3 border-t shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              onClick={handleCopyContract}
              className="w-full h-11 text-sm font-semibold gap-2"
            >
              <Copy className="w-4 h-4" />
              {t('order.actions.copyToClipboard')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
