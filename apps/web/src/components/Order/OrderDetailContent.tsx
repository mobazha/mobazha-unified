'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { ProductImageNative } from '@/components/ui/product-image';
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
  isOrderFulfilled,
  getDisputeTimeoutDetails,
  type OrderAction,
  type UserRole as CoreUserRole,
  useI18n,
  useCurrency,
  // 从 @mobazha/core 导入订单展示类型
  type DisplayOrder as CoreDisplayOrder,
  type DisplayOrderItem,
  type DisplayOrderParticipant,
  type DisplayModerator,
  type DisplayTimelineEvent,
} from '@mobazha/core';
import type { Order as CoreOrder, Product } from '@mobazha/core';
import {
  OrderFooter,
  OrderProgressBar,
  PaymentCard,
  FulfillmentCard,
  AcceptedCard,
  OrderCompleteCard,
} from '@/components/Order';
import { RwaAssetDetail } from '@/components/RwaToken';
import { EscrowStatusBar } from '@/components/Trust';
import { Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBlockExplorerUrl } from '@/components/Order/utils';
import { useToast } from '@/components/ui/use-toast';
import { WriteReviewDialog } from './WriteReviewDialog';
import { ordersApi } from '@mobazha/core';

// ============ Types ============
// 从 @mobazha/core 重新导出基础类型，保持向后兼容
export type OrderItem = DisplayOrderItem;
export type OrderVendor = DisplayOrderParticipant;
export type Moderator = DisplayModerator;
export type TimelineEvent = DisplayTimelineEvent;

/**
 * UI 组件使用的 DisplayOrder 类型
 * 继承自 @mobazha/core 的 CoreDisplayOrder，添加 UI 特有的回调函数
 */
export interface DisplayOrder extends CoreDisplayOrder {
  // RWA 取消/退款回调（UI 特有）
  onRwaCancelOrder?: () => Promise<void>;
  onRwaClaimExpired?: () => Promise<void>;
}

export interface OrderDetailContentProps {
  /** 显示订单数据 */
  displayOrder: DisplayOrder;
  /** 核心订单数据（用于 OrderFooter） */
  coreOrder?: CoreOrder | null;
  /** 当前用户 peerID */
  currentUserPeerID?: string | null;
  /** 是否在 Modal 中显示（影响布局） */
  inModal?: boolean;
  /** 是否显示底部操作栏 */
  showFooter?: boolean;
  /** 是否正在执行操作 */
  isActionLoading?: boolean;
  /** 刷新订单数据 */
  refetch?: () => void;
  /** 订单更新回调 */
  onOrderUpdate?: (order: DisplayOrder) => void;
  /** 关闭回调（用于 Modal） */
  onClose?: () => void;
  /** 支付回调（打开支付选择器） */
  onPay?: (orderId: string) => void;
  /** 开立争议回调 */
  onOpenDispute?: () => void;
  className?: string;
}

// ============ Utility Functions ============

type TranslateFn = (key: string) => string;

/**
 * 根据订单状态计算进度条配置
 * 参考桌面端 Summary.vue 中的 progressBarState 计算逻辑
 *
 * 状态映射（与桌面端一致）：
 * - awaiting_payment: currentState = 0 (未支付)
 * - pending/paid: currentState = 1 (已支付，等待确认)
 * - processing: currentState = 2 (已接受)
 * - shipped/delivered: currentState = 3 (已发货)
 * - completed: currentState = 4 (完成)
 */
function getProgressBarState(
  status: DisplayOrder['status'],
  t: TranslateFn,
  hasDispute?: boolean,
  hasDisputeResolution?: boolean
): { states: string[]; currentState: number; disputeState: number } {
  // 争议流程
  if (
    status === 'disputed' ||
    (hasDispute && !['completed', 'refunded', 'cancelled'].includes(status))
  ) {
    return {
      states: [
        t('order.stages.disputed'),
        t('order.stages.decided'),
        t('order.stages.resolved'),
        t('order.stages.complete'),
      ],
      currentState: status === 'disputed' ? 1 : hasDisputeResolution ? 3 : 2,
      disputeState: 1,
    };
  }

  // 取消/退款流程
  if (['cancelled', 'refunded'].includes(status)) {
    const endState =
      status === 'cancelled'
        ? t('order.cancelled')
        : status === 'refunded'
          ? t('order.refunded')
          : t('order.stages.declined');
    return {
      states: [t('order.stages.paid'), endState],
      currentState: 2,
      disputeState: 0,
    };
  }

  // 正常流程：Paid → Accepted → Fulfilled → Complete
  const normalStates = [
    t('order.stages.paid'),
    t('order.stages.accepted'),
    t('order.stages.fulfilled'),
    t('order.stages.complete'),
  ];
  let currentState = 0;

  switch (status) {
    case 'awaiting_payment':
      // 真正的未支付状态
      currentState = 0;
      break;
    case 'pending':
    case 'paid':
      // 已支付，等待确认（参考桌面端：PENDING 状态 currentState = 1）
      currentState = 1;
      break;
    case 'processing':
      // 已接受（参考桌面端：AWAITING_FULFILLMENT 状态 currentState = 2）
      currentState = 2;
      break;
    case 'shipped':
    case 'delivered':
      // 已发货（参考桌面端：FULFILLED 状态 currentState = 3）
      currentState = 3;
      break;
    case 'completed':
      // 完成（参考桌面端：COMPLETED 状态 currentState = 4）
      currentState = 4;
      break;
    default:
      // 默认为未支付
      currentState = 0;
  }

  return {
    states: normalStates,
    currentState,
    disputeState: 0,
  };
}

// ============ Dispute Timeout Card ============

interface DisputeTimeoutCardProps {
  createdAt: string;
  onOpenDispute: () => void;
}

function DisputeTimeoutCard({ createdAt, onOpenDispute }: DisputeTimeoutCardProps) {
  const { t } = useI18n();
  const timeoutDetails = useMemo(() => getDisputeTimeoutDetails(createdAt), [createdAt]);

  if (timeoutDetails.isExpired) {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-warning/8 border border-warning/20 rounded-lg">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-3.5 h-3.5 text-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="flex-1 text-xs sm:text-xs text-warning leading-snug">
          {t('order.dispute.escrowHint', { time: timeoutDetails.timeRemainingStr })}
          <span
            className="inline-flex items-center ml-1 text-warning cursor-help"
            title={t('order.disputeHelpTip')}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-destructive text-destructive hover:bg-destructive/10 font-medium"
        onClick={onOpenDispute}
        data-testid="order-detail-open-dispute"
      >
        {t('order.openDispute')}
      </Button>
    </div>
  );
}

// ============ Main Component ============

export const OrderDetailContent = memo(function OrderDetailContent({
  displayOrder,
  coreOrder,
  currentUserPeerID: _currentUserPeerID,
  inModal = false,
  showFooter = true,
  isActionLoading: externalActionLoading = false,
  refetch,
  onOrderUpdate,
  onClose: _onClose,
  onPay,
  onOpenDispute,
  className,
}: OrderDetailContentProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { formatPrice: formatCurrencyPrice } = useCurrency();

  const formatCountryCode = useCallback(
    (code?: string) => {
      if (!code) return '';
      const upper = code.toUpperCase();
      const key = `order.countries.${upper}`;
      const translated = t(key);
      if (translated && translated !== key) return translated;
      return upper
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
    [t]
  );

  // 本地状态用于 UI 操作
  const [localOrder, setLocalOrder] = useState<DisplayOrder | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [pendingCompleteWithReview, setPendingCompleteWithReview] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState<'buyer' | 'seller' | 'split' | null>(
    null
  );

  // 使用本地状态（如果有本地修改）或传入数据
  const order = localOrder || displayOrder;

  // ============ Action Handlers ============

  const handleConfirmReceipt = useCallback(() => {
    setPendingCompleteWithReview(true);
    setShowReviewDialog(true);
  }, []);

  const executeCompleteOrder = useCallback(
    async (ratings?: { overall: number; review: string; anonymous: boolean }) => {
      setIsActionLoading(true);
      try {
        const payload: Parameters<typeof ordersApi.completeOrder>[0] = {
          orderID: order.id,
        };
        if (ratings && ratings.overall > 0) {
          payload.ratings = [
            {
              slug: order.slug || order.items[0]?.title || '',
              overall: ratings.overall,
              review: ratings.review || undefined,
            },
          ];
          payload.anonymous = ratings.anonymous;
        }
        await ordersApi.completeOrder(payload);
        const updated = {
          ...order,
          status: 'completed' as const,
          timeline: [
            ...order.timeline,
            {
              status: 'completed',
              timestamp: new Date().toISOString(),
              description: t('order.timeline.orderCompleted'),
              actor: 'buyer' as const,
            },
          ],
        };
        setLocalOrder(updated);
        onOrderUpdate?.(updated);
        toast({
          title: t('order.orderCompleted'),
          description: ratings?.overall
            ? t('order.actions.reviewSubmitted')
            : t('order.receiptConfirmed'),
          variant: 'success',
        });
        refetch?.();
      } catch (error) {
        toast({
          title: t('common.error'),
          description: t('order.receiptConfirmFailed') + (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsActionLoading(false);
        setShowReviewDialog(false);
        setPendingCompleteWithReview(false);
      }
    },
    [order, refetch, onOrderUpdate, t, toast]
  );

  const handleOpenDispute = useCallback(async () => {
    if (!disputeReason.trim()) {
      toast({
        title: t('common.error'),
        description: t('order.provideDisputeReason'),
        variant: 'destructive',
      });
      return;
    }
    setIsActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const updated = {
        ...order,
        status: 'disputed' as const,
        dispute: {
          id: 'dispute-' + Date.now(),
          claim: disputeReason,
          status: 'open' as const,
          initiator: 'buyer' as const,
        },
        timeline: [
          ...order.timeline,
          {
            status: 'disputed',
            timestamp: new Date().toISOString(),
            description: t('order.timeline.disputeOpened'),
            actor: 'buyer' as const,
          },
        ],
      };
      setLocalOrder(updated);
      onOrderUpdate?.(updated);
      setShowDisputeModal(false);
      setDisputeReason('');
      toast({
        title: t('order.disputeOpened'),
        description: t('order.disputeOpenedSuccess'),
        variant: 'success',
      });
      refetch?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('order.disputeOpenFailed') + (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [disputeReason, order, refetch, onOrderUpdate, t, toast]);

  const handleRefundConfirm = useCallback(async () => {
    setShowRefundDialog(false);
    setIsActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const updated = {
        ...order,
        status: 'refunded' as const,
        timeline: [
          ...order.timeline,
          {
            status: 'refunded',
            timestamp: new Date().toISOString(),
            description: t('order.refundSuccess'),
            actor: 'seller' as const,
          },
        ],
      };
      setLocalOrder(updated);
      onOrderUpdate?.(updated);
      toast({
        title: t('order.actions.refundSuccess'),
        description: t('order.refundSuccess'),
        variant: 'success',
      });
      refetch?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('order.refundFailed') + (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [order, refetch, onOrderUpdate, t, toast]);

  const handleResolveDisputeConfirm = useCallback(async () => {
    if (!showResolveDialog) return;
    const decision = showResolveDialog;
    setShowResolveDialog(null);
    setIsActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      let newStatus: DisplayOrder['status'];
      let description: string;

      switch (decision) {
        case 'buyer':
          newStatus = 'refunded';
          description = t('order.resolveDisputeBuyerDesc');
          break;
        case 'seller':
          newStatus = 'completed';
          description = t('order.resolveDisputeSellerDesc');
          break;
        case 'split':
          newStatus = 'split_resolved';
          description = t('order.resolveDisputeSplitDesc');
          break;
        default:
          newStatus = 'completed';
          description = t('order.disputeResolved');
      }

      const updated = {
        ...order,
        status: newStatus,
        dispute: order.dispute
          ? { ...order.dispute, status: 'resolved' as const, resolution: decision }
          : undefined,
        timeline: [
          ...order.timeline,
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            description,
            actor: 'moderator' as const,
          },
        ],
      };
      setLocalOrder(updated);
      onOrderUpdate?.(updated);
      toast({
        title: t('order.disputeResolved'),
        description: t('order.disputeResolvedSuccess'),
        variant: 'success',
      });
      refetch?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('order.resolveDisputeFailed') + (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [showResolveDialog, order, refetch, onOrderUpdate, t, toast]);

  // 统一处理订单操作（用于 OrderFooter）
  const handleOrderAction = useCallback(
    (action: OrderAction) => {
      switch (action) {
        case 'Pay':
          // 如果提供了 onPay 回调，则调用它打开支付选择器
          if (onPay) {
            onPay(order.id);
          } else {
            toast({ description: t('order.actions.pay') });
          }
          break;
        case 'Cancel':
          toast({ description: t('order.actions.cancel') });
          break;
        case 'Dispute':
          setShowDisputeModal(true);
          break;
        case 'Complete':
          handleConfirmReceipt();
          break;
        case 'WriteReview':
          setShowReviewDialog(true);
          break;
        case 'Accept':
          toast({ description: t('order.actions.accept') });
          break;
        case 'Decline':
          toast({ description: t('order.actions.decline') });
          break;
        case 'Fulfill':
          // 发货操作由页面级组件处理
          break;
        case 'Refund':
          setShowRefundDialog(true);
          break;
        case 'Claim':
          toast({ description: t('order.actions.claim') });
          break;
        case 'AcceptPayout':
          toast({ description: t('order.actions.acceptPayout') });
          break;
      }
    },
    [handleConfirmReceipt, onPay, order.id, t, toast]
  );

  // ============ Permission Checks ============

  const canConfirmReceipt =
    order.userRole === 'buyer' && ['shipped', 'delivered'].includes(order.status);
  const canOpenDispute =
    order.userRole === 'buyer' &&
    ['paid', 'processing', 'shipped', 'delivered'].includes(order.status) &&
    !order.dispute;
  const canRefund =
    order.userRole === 'seller' && ['paid', 'processing', 'shipped'].includes(order.status);
  const canResolveDispute = order.userRole === 'moderator' && order.status === 'disputed';

  const isLoading = isActionLoading || externalActionLoading;

  // ============ Progress Bar State ============

  const progressState = useMemo(
    () =>
      getProgressBarState(order.status, t, !!order.dispute, order.dispute?.status === 'resolved'),
    [order.status, order.dispute, t]
  );

  const statusLabel = useMemo(() => {
    const raw = order.status?.toString() || '';
    if (!raw) return '';
    // 使用 i18n 翻译状态
    const statusKeys: Record<string, string> = {
      pending: 'order.pending',
      awaiting_payment: 'order.statusLabels.awaitingPayment',
      paid: 'order.stages.paid',
      processing: 'order.stages.accepted',
      shipped: 'order.stages.fulfilled',
      delivered: 'order.stages.delivered',
      completed: 'order.stages.complete',
      disputed: 'order.stages.disputed',
      cancelled: 'order.statusLabels.cancelled',
      refunded: 'order.statusLabels.refunded',
    };
    const key = statusKeys[raw];
    if (key) return t(key);
    return raw.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
  }, [order.status, t]);

  // 检查是否是 RWA Token 订单，并构造 Product 对象
  const { isRwaTokenOrder, rwaProduct } = useMemo(() => {
    const listing = coreOrder?.contract?.orderOpen?.listings?.[0]?.listing;
    if (!listing || listing.metadata?.contractType !== 'RWA_TOKEN') {
      return { isRwaTokenOrder: false, rwaProduct: null };
    }

    // 从 ContractListing 构造 Product 对象
    const product: Product = {
      slug: listing.slug,
      vendorID: listing.vendorID,
      metadata: {
        version: 1,
        contractType: 'RWA_TOKEN',
        format: 'FIXED_PRICE',
        expiry: '',
        acceptedCurrencies: listing.metadata.acceptedCurrencies || [],
        pricingCurrency: listing.metadata.pricingCurrency,
        escrowTimeoutHours: 0,
      },
      item: listing.item,
      shippingOptions: listing.shippingOptions,
    };

    return { isRwaTokenOrder: true, rwaProduct: product };
  }, [coreOrder]);

  return (
    <div
      className={cn('flex flex-col overflow-x-hidden', className)}
      data-testid="order-detail-content"
    >
      {/* Scrollable Content */}
      <div
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          inModal ? 'px-4 sm:px-6 py-4' : ''
        )}
      >
        {/* Title Row - 订单号完整显示（仅桌面端显示，移动端顶部已有） */}
        <div className="hidden sm:flex items-start gap-1.5 sm:gap-2 mb-1">
          <h1 className="text-xs sm:text-sm font-medium text-muted-foreground flex-shrink-0">
            {t('order.orderIdLabel')}
          </h1>
          <span
            className="text-xs sm:text-sm font-mono text-foreground break-all leading-relaxed"
            title={order.orderId}
          >
            {order.orderId}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(order.orderId);
            }}
            className="text-primary hover:text-primary/80 text-xs font-medium flex items-center gap-1 touch-feedback flex-shrink-0"
            data-testid="order-detail-copy-id"
          >
            <Copy className="w-3 h-3" />
            <span className="hidden sm:inline">{t('common.copy')}</span>
          </button>
        </div>

        {/* ========== 商品信息 - 靠前显示 ========== */}
        {(() => {
          // 获取商品类型标签
          const getTypeLabel = () => {
            if (!order.contractType || order.contractType === 'PHYSICAL_GOOD') return null;
            if (order.contractType === 'SERVICE') return t('order.product.service');
            if (order.contractType === 'DIGITAL_GOOD') return t('order.product.digital');
            return null;
          };
          const typeLabel = getTypeLabel();

          // 格式化单价显示（使用商品单价，而非订单总额）
          const formatPrice = () => {
            const price = order.items[0]?.price;
            const currency = order.items[0]?.currency;
            if (!price || !currency) return '--';
            return formatCurrencyPrice(price, currency);
          };

          const vendorRow = order.vendor?.peerID ? (
            <Link
              href={`/store/${order.vendor.peerID}`}
              className="flex items-center gap-2.5 p-2.5 mb-2 bg-muted/20 rounded-lg border border-border/40"
            >
              <Avatar
                src={order.vendor.avatar}
                name={order.vendor.name}
                size="md"
                className="w-9 h-9 ring-1 ring-border/50"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {order.vendor.name}
                </p>
                {order.vendor.peerID && (
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    {order.vendor.peerID.length > 16
                      ? `${order.vendor.peerID.slice(0, 6)}…${order.vendor.peerID.slice(-4)}`
                      : order.vendor.peerID}
                  </p>
                )}
              </div>
            </Link>
          ) : null;

          const productCard = (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border/50">
                <ProductImageNative
                  src={order.items[0]?.image}
                  alt={order.items[0]?.title ?? ''}
                  iconSize="sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm truncate">
                  {order.items[0]?.title || t('order.unknownItem')}
                </h4>
                {/* 类型标签和单价分行显示 */}
                <div className="flex flex-col gap-1 mt-1">
                  {typeLabel && (
                    <span className="text-xs text-info bg-info/8 px-1.5 py-0.5 rounded w-fit">
                      {typeLabel}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {t('order.product.unitPrice')}
                    </span>
                    <span className="text-sm text-primary font-medium">{formatPrice()}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs text-muted-foreground">
                  {t('order.product.quantity')}:{' '}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {order.items[0]?.quantity || 1}
                </span>
              </div>
            </div>
          );

          return (
            <div className="mb-4">
              {vendorRow}
              {order.slug ? (
                <Link
                  href={
                    order.vendor?.peerID
                      ? `/product/${order.slug}?peerID=${order.vendor.peerID}`
                      : `/product/${order.slug}`
                  }
                  className="block group"
                >
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all">
                      <ProductImageNative
                        src={order.items[0]?.image}
                        alt={order.items[0]?.title ?? ''}
                        className="group-hover:scale-105 transition-transform duration-300"
                        iconSize="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                        {order.items[0]?.title || t('order.unknownItem')}
                      </h4>
                      {/* 类型标签和单价分行显示 */}
                      <div className="flex flex-col gap-1 mt-1">
                        {typeLabel && (
                          <span className="text-xs text-info bg-info/8 px-1.5 py-0.5 rounded w-fit">
                            {typeLabel}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {t('order.product.unitPrice')}
                          </span>
                          <span className="text-sm text-primary font-medium">{formatPrice()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {t('order.product.quantity')}:{' '}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {order.items[0]?.quantity || 1}
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                productCard
              )}
            </div>
          );
        })()}

        {/* Summary（更接近原移动端：概要 + 状态徽章 + 总价） */}
        <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">{t('order.summary')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-border/60 text-foreground bg-background/60">
              {statusLabel || progressState.currentState}
            </span>
          </div>
          {/* 有运费时拆分显示：小计 + 运费 + 总计 */}
          {order.shippingAmount ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{t('order.subtotal')}</div>
                <div className="text-xs text-foreground">
                  {order.pricingCurrency
                    ? formatCurrencyPrice(order.items[0]?.price || '0', order.pricingCurrency)
                    : order.items[0]?.price || ''}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{t('order.shippingFee')}</div>
                <div className="text-xs text-foreground">
                  {order.pricingCurrency
                    ? formatCurrencyPrice(order.shippingAmount, order.pricingCurrency)
                    : order.shippingAmount}
                </div>
              </div>
              <div className="flex items-end justify-between pt-1 border-t border-border/30">
                <div className="text-xs text-muted-foreground">{t('order.total')}</div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {order.pricingCurrency
                      ? formatCurrencyPrice(
                          order.pricingAmount || order.total,
                          order.pricingCurrency
                        )
                      : order.pricingAmount || order.total}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-between">
              <div className="text-xs text-muted-foreground">{t('order.total')}</div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {order.pricingCurrency
                    ? formatCurrencyPrice(order.pricingAmount || order.total, order.pricingCurrency)
                    : order.pricingAmount || order.total}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3-stage status bar（资金已保护 → 商品运输中 → 交易完成） */}
        <div className="mt-3 sm:mt-4 mb-4 sm:mb-6 px-2 sm:px-8">
          <EscrowStatusBar status={displayOrder.status} />
        </div>

        {/* 桌面端：保留原有进度条 */}
        <div className="hidden sm:block mt-0 mb-4 sm:mb-6 px-2 sm:px-8">
          <OrderProgressBar
            states={progressState.states}
            currentState={progressState.currentState}
            disputeState={progressState.disputeState}
          />
        </div>

        {/* Dispute Banner */}
        {order.dispute && (
          <div className="p-3 sm:p-4 bg-error/8 border border-error/20 rounded-lg mb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-error mb-0.5 text-sm sm:text-base">
                  {t('order.disputeOpen')}
                </h3>
                <p className="text-xs sm:text-sm text-error">{order.dispute.claim}</p>
                <p className="text-xs sm:text-xs text-error mt-0.5">
                  {t('order.initiatedBy', { party: order.dispute.initiator })} •{' '}
                  {t('order.disputeStatus', { status: order.dispute.status })}
                </p>
              </div>
              {canResolveDispute && (
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => setShowResolveDialog('buyer')}
                    className="text-xs"
                  >
                    {t('order.favorBuyer')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowResolveDialog('seller')}
                    className="text-xs"
                  >
                    {t('order.favorSeller')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowResolveDialog('split')}
                    className="text-xs"
                  >
                    {t('order.splitFunds')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order History（原移动端风格：标题 + 小卡片列表） */}
        {(() => {
          const hasHistory =
            order.status === 'completed' ||
            order.trackingNumber ||
            ['processing', 'shipped', 'delivered', 'completed'].includes(order.status);
          if (!hasHistory) return null;

          return (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">
                  {t('order.orderHistory')}
                </span>
              </div>
              <div className="space-y-2">
                {order.status === 'completed' && (
                  <div className="bg-muted/10 rounded-lg p-2">
                    <OrderCompleteCard
                      timestamp={order.timeline.find(e => e.status === 'completed')?.timestamp}
                      amount={order.total}
                      currency={order.currency}
                      description={t('order.fundsReleased')}
                      showDivider={false}
                    />
                  </div>
                )}

                {(order.trackingNumber ||
                  ['shipped', 'delivered', 'completed'].includes(order.status)) && (
                  <div className="bg-muted/10 rounded-lg p-2">
                    <FulfillmentCard
                      timestamp={order.timeline.find(e => e.status === 'shipped')?.timestamp}
                      shipper={order.shipper}
                      trackingNumber={order.trackingNumber}
                      contractType={order.contractType}
                      showDivider={false}
                    />
                  </div>
                )}

                {['processing', 'shipped', 'delivered', 'completed'].includes(order.status) && (
                  <div className="bg-muted/10 rounded-lg p-2">
                    <AcceptedCard
                      timestamp={order.timeline.find(e => e.status === 'processing')?.timestamp}
                      description={
                        order.userRole === 'seller'
                          ? t('order.acceptedDescSeller')
                          : t('order.acceptedDescBuyer')
                      }
                      showDivider={false}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Payment（标题 + 日期 + 查看交易） */}
        {order.paymentTx && !order.paymentLocked && (
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-semibold text-foreground">
                {t('order.payment.title')}
              </span>
              <div className="text-xs text-muted-foreground">
                {order.timeline.find(e => e.status === 'paid')?.timestamp
                  ? new Date(
                      order.timeline.find(e => e.status === 'paid')!.timestamp
                    ).toLocaleDateString()
                  : ''}
              </div>
            </div>
            <button
              onClick={() => {
                if (!order.paymentTx) return;
                const url = getBlockExplorerUrl(
                  order.paymentTx,
                  order.currency || '',
                  order.chainId
                );
                if (url) window.open(url, '_blank');
              }}
              className="text-xs text-primary hover:underline"
            >
              {t('order.viewTransaction')}
            </button>
          </div>
        )}

        {/* RWA Payment Locked Card */}
        {order.paymentLocked &&
          (() => {
            // 判断订单是否已完成（资金已释放）
            const completedStatuses = ['shipped', 'delivered', 'completed', 'split_resolved'];
            const isReleased = completedStatuses.includes(order.status);

            // 计算是否过期（只有在资金未释放时才可能过期）
            const isExpired =
              !isReleased && order.paymentLocked.expiresAt
                ? new Date(order.paymentLocked.expiresAt) <= new Date()
                : false;

            // 确定卡片样式类
            const cardColorClass = isReleased
              ? 'from-info/8 to-info/8 border-info/20'
              : isExpired
                ? 'from-error/8 to-error/8 border-error/20'
                : 'from-success/8 to-success/8 border-success/20';

            const textColorClass = isReleased
              ? 'text-info'
              : isExpired
                ? 'text-error'
                : 'text-success';

            const badgeColorClass = isReleased ? 'bg-info' : isExpired ? 'bg-error' : 'bg-success';

            const statusText = isReleased
              ? t('order.paymentLocked.released')
              : isExpired
                ? t('order.paymentLocked.expired')
                : t('order.paymentLocked.locked');

            return (
              <div className={`bg-gradient-to-r ${cardColorClass} border rounded-lg p-4 mb-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className={`font-semibold ${textColorClass}`}>
                      {t('order.paymentLocked.title')}
                    </h4>
                    {/* 查看交易链接 */}
                    {order.paymentTx && (
                      <button
                        onClick={() => {
                          const url = getBlockExplorerUrl(
                            order.paymentTx!,
                            order.currency || '',
                            order.chainId
                          );
                          if (url) window.open(url, '_blank');
                        }}
                        className={`text-xs hover:underline ${textColorClass}`}
                      >
                        {t('order.viewTransaction')}
                      </button>
                    )}
                  </div>
                  <span
                    className={`${badgeColorClass} text-white text-xs font-semibold px-3 py-1 rounded-full`}
                  >
                    {statusText}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  {(() => {
                    // 行内颜色类
                    const borderClass = isReleased
                      ? 'border-info/15'
                      : isExpired
                        ? 'border-error/15'
                        : 'border-success/15';
                    const labelClass = isReleased
                      ? 'text-info/70'
                      : isExpired
                        ? 'text-error/70'
                        : 'text-success/70';
                    const valueClass = isReleased
                      ? 'text-info'
                      : isExpired
                        ? 'text-error'
                        : 'text-success';

                    return (
                      <>
                        <div
                          className={`flex justify-between items-center py-1 border-b ${borderClass}`}
                        >
                          <span className={labelClass}>{t('order.paymentLocked.amount')}</span>
                          <span className={`font-medium ${valueClass}`}>
                            {order.paymentLocked.amount} {order.paymentLocked.coin}
                          </span>
                        </div>
                        {/* 购买数量 */}
                        {order.items?.[0]?.quantity && (
                          <div
                            className={`flex justify-between items-center py-1 border-b ${borderClass}`}
                          >
                            <span className={labelClass}>
                              {t('order.paymentLocked.purchaseQuantity')}
                            </span>
                            <span className={`font-medium ${valueClass}`}>
                              {order.items[0].quantity}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex justify-between items-center py-1 border-b ${borderClass}`}
                        >
                          <span className={labelClass}>{t('order.paymentLocked.token')}</span>
                          <span className={`font-medium ${valueClass}`}>
                            {order.paymentLocked.coin}
                          </span>
                        </div>
                        {order.paymentLocked.buyerReceiveAddress && (
                          <div
                            className={`flex justify-between items-center py-1 border-b ${borderClass}`}
                          >
                            <span className={labelClass}>
                              {t('order.paymentLocked.buyerAddress')}
                            </span>
                            <span
                              className={`font-mono text-xs truncate max-w-[180px] ${valueClass}`}
                              title={order.paymentLocked.buyerReceiveAddress}
                            >
                              {order.paymentLocked.buyerReceiveAddress.slice(0, 8)}...
                              {order.paymentLocked.buyerReceiveAddress.slice(-6)}
                            </span>
                          </div>
                        )}
                        {order.paymentLocked.timestamp && (
                          <div
                            className={`flex justify-between items-center py-1 border-b ${borderClass}`}
                          >
                            <span className={labelClass}>
                              {t('order.paymentLocked.lockedTime')}
                            </span>
                            <span className={valueClass}>
                              {new Date(order.paymentLocked.timestamp).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {/* 过期时间 - 只在资金未释放时显示 */}
                        {order.paymentLocked.expiresAt && !isReleased && (
                          <div className="flex justify-between items-center py-1">
                            <span className={labelClass}>{t('order.paymentLocked.expiresAt')}</span>
                            <span className={valueClass}>
                              {new Date(order.paymentLocked.expiresAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                {/* 买家端显示提示和操作按钮 */}
                {order.userRole === 'buyer' && !isReleased && (
                  <div
                    className={`mt-3 pt-3 border-t ${
                      isExpired ? 'border-error/20' : 'border-success/20'
                    }`}
                  >
                    {isExpired ? (
                      <>
                        <p className="text-sm text-error mb-3">
                          {t('order.paymentLocked.expiredCanClaim')}
                        </p>
                        {displayOrder.onRwaClaimExpired && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={displayOrder.onRwaClaimExpired}
                            className="w-full"
                          >
                            {t('order.paymentLocked.claimRefund')}
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-success text-sm mb-3">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          {t('order.paymentLocked.waitingForSeller')}
                        </div>
                        {displayOrder.onRwaCancelOrder && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={displayOrder.onRwaCancelOrder}
                            className="w-full"
                          >
                            {t('order.paymentLocked.cancelOrder')}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
                {/* 资金已释放提示 */}
                {isReleased && (
                  <div className="mt-3 pt-3 border-t border-info/20">
                    <p className="text-sm text-info">
                      {t('order.paymentLocked.fundsReleasedToSeller')}
                    </p>
                  </div>
                )}
                {/* 卖家端显示提示 */}
                {order.userRole === 'seller' && !isExpired && !isReleased && (
                  <div className="mt-3 pt-3 border-t border-success/20">
                    <p className="text-sm text-success">
                      {t('order.paymentLocked.waitingToConfirm')}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

        {/* Traditional Payment Card - 只显示加密货币金额 */}
        {order.paymentTx && !order.paymentLocked && (
          <PaymentCard
            amount={order.total}
            currency={order.currency}
            txHash={order.paymentTx}
            confirmations={order.txConfirmations}
            chainId={order.chainId}
            timestamp={order.timeline.find(e => e.status === 'paid')?.timestamp}
            title={t('order.paid')}
            description={!order.moderator ? t('order.directPaymentDesc') : undefined}
            showDivider={true}
          />
        )}

        {/* RWA Asset Details Section */}
        {isRwaTokenOrder && rwaProduct && (
          <div className="mb-4">
            <RwaAssetDetail product={rwaProduct} showPurchaseHint={false} compact={true} />
          </div>
        )}

        {/* 争议提示卡片 - 放在支付之后 */}
        {onOpenDispute && canOpenDispute && !order.dispute && (
          <DisputeTimeoutCard createdAt={order.createdAt} onOpenDispute={onOpenDispute} />
        )}

        {/* Moderator */}
        {order.moderator && (
          <div className="p-2.5 mb-4 bg-muted/20 rounded-lg border border-border/30">
            <span className="text-xs text-muted-foreground block mb-1">{t('order.moderator')}</span>
            <Link href={`/moderators/${order.moderator.id}`} className="flex items-center gap-2">
              <Avatar
                src={order.moderator.avatar}
                name={order.moderator.name}
                size="sm"
                className="w-8 h-8 ring-1 ring-border/50"
              />
              <span className="text-sm font-medium text-primary hover:underline">
                {order.moderator.name}
              </span>
            </Link>
          </div>
        )}

        {/* ========== Memo / Contact 直显（不折叠） ========== */}
        {(() => {
          const hasMemo = !!order.notes;
          const hasContact = !!order.alternateContactInfo;
          if (!hasMemo && !hasContact) return null;
          return (
            <div className="space-y-2 mb-4">
              {hasMemo && (
                <div className="p-2.5 bg-muted/20 rounded-lg">
                  <span className="text-xs text-muted-foreground block mb-0.5">
                    {t('order.memo')}
                  </span>
                  <p className="text-sm text-foreground">{order.notes}</p>
                </div>
              )}
              {hasContact && (
                <div className="p-2.5 bg-muted/20 rounded-lg">
                  <span className="text-xs text-muted-foreground block mb-0.5">
                    {t('order.additionalContact')}
                  </span>
                  <p className="text-sm text-foreground">{order.alternateContactInfo}</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========== Shipping 详情（仅实物商品折叠） ========== */}
        {(() => {
          const isPhysicalGood = order.contractType === 'PHYSICAL_GOOD';
          const hasShippingInfo =
            isPhysicalGood && (order.shippingRecipient || order.shippingAddressLine1);
          const hasShippingMeta = isPhysicalGood && (order.shippingOption || order.shippingService);
          if (!hasShippingInfo && !hasShippingMeta) return null;

          return (
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-2.5 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors border border-border/30">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="text-sm font-medium text-foreground">
                    {t('order.shippingDetails')}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </summary>
              <div className="pt-3 space-y-3 text-xs sm:text-sm">
                {hasShippingInfo && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <span className="text-muted-foreground block mb-1 text-xs font-medium">
                      {t('order.shipTo')}
                    </span>
                    <div className="text-foreground whitespace-pre-line">
                      {order.shippingRecipient && (
                        <p className="font-medium">{order.shippingRecipient}</p>
                      )}
                      {order.shippingAddressLine1 && <p>{order.shippingAddressLine1}</p>}
                      {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
                      {(order.shippingCity || order.shippingState || order.shippingPostalCode) && (
                        <p>
                          {[order.shippingCity, order.shippingState, order.shippingPostalCode]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {order.shippingCountryCode && (
                        <p>{formatCountryCode(order.shippingCountryCode)}</p>
                      )}
                    </div>
                    {order.shippingAddress && order.shippingAddress !== 'No shipping address' && (
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(order.shippingAddress)}
                          className="text-xs text-primary hover:underline"
                        >
                          {t('order.actions.copyToClipboard')}
                        </button>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(order.shippingAddress.replace(/\n/g, ', '))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {t('order.viewOnMap')}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {hasShippingMeta && (
                  <div className="flex gap-4 p-3 bg-muted/20 rounded-lg">
                    {order.shippingOption && (
                      <div>
                        <span className="text-muted-foreground block mb-0.5 text-xs">
                          {t('order.shippingOption')}
                        </span>
                        <p className="text-foreground">{order.shippingOption}</p>
                      </div>
                    )}
                    {order.shippingService && (
                      <div>
                        <span className="text-muted-foreground block mb-0.5 text-xs">
                          {t('order.shippingService')}
                        </span>
                        <p className="text-foreground">{order.shippingService}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          );
        })()}

        {/* Action Buttons - 仅在 Modal 的桌面端显示，移动端使用底部 footer */}
        {/* 注意：Message 和 Open Dispute 按钮已移至左侧边栏，这里只保留其他操作 */}
        {inModal && (canConfirmReceipt || canRefund) && (
          <div className="hidden lg:flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {canConfirmReceipt && (
              <Button
                size="sm"
                onClick={handleConfirmReceipt}
                disabled={isLoading}
                className="touch-feedback"
                data-testid="order-detail-confirm-receipt"
              >
                {isLoading ? t('common.processing') : t('order.actions.complete')}
              </Button>
            )}

            {/* 发货按钮由页面级组件处理 */}

            {canRefund && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRefundDialog(true)}
                disabled={isLoading}
                className="touch-feedback"
                data-testid="order-detail-refund"
              >
                {t('order.refundOrder')}
              </Button>
            )}
          </div>
        )}

        {/* Participants Info - 在 Modal 中显示，在 Page 中单独处理 */}
        {inModal && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            {/* Seller Info */}
            <Link
              href={order.vendor?.peerID ? `/store/${order.vendor.peerID}` : '#'}
              className="group p-3 bg-muted/30 rounded-xl border border-border/50 block hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t('order.seller')}
              </h4>
              <HStack gap="sm" align="center">
                <Avatar
                  src={order.vendor.avatar}
                  name={order.vendor.name}
                  size="sm"
                  className="w-9 h-9 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
                />
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                    {order.vendor.name}
                  </p>
                  {order.vendor.location && (
                    <p className="text-xs text-muted-foreground truncate">
                      {order.vendor.location}
                    </p>
                  )}
                </div>
              </HStack>
            </Link>

            {/* Buyer Info */}
            {order.buyer && (
              <Link
                href={order.buyer?.peerID ? `/store/${order.buyer.peerID}` : '#'}
                className="group p-3 bg-muted/30 rounded-xl border border-border/50 block hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t('order.buyer')}
                </h4>
                <HStack gap="sm" align="center">
                  <Avatar
                    src={order.buyer.avatar}
                    name={order.buyer.name}
                    size="sm"
                    className="w-9 h-9 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                      {order.buyer.name}
                    </p>
                    {order.buyer.location && (
                      <p className="text-xs text-muted-foreground truncate">
                        {order.buyer.location}
                      </p>
                    )}
                  </div>
                </HStack>
              </Link>
            )}

            {/* Moderator Info */}
            {order.moderator && (
              <Link
                href={`/moderators/${order.moderator.id}`}
                className="group p-3 bg-muted/30 rounded-xl border border-border/50 block hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t('order.moderator')}
                </h4>
                <HStack gap="sm" align="center">
                  <Avatar
                    src={order.moderator.avatar}
                    name={order.moderator.name}
                    size="sm"
                    className="w-9 h-9 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                      {order.moderator.name}
                    </p>
                    {order.moderator.location && (
                      <p className="text-xs text-muted-foreground truncate">
                        {order.moderator.location}
                      </p>
                    )}
                    <p className="text-xs text-primary font-medium">
                      {t('order.moderatorFeePercent', { fee: order.moderator.fee })}
                    </p>
                  </div>
                </HStack>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Order Action Footer - 仅在 Modal 外或明确需要时显示 */}
      {showFooter && !inModal && coreOrder && (
        <OrderFooter
          orderState={coreOrder?.state || 'PENDING'}
          userRole={order.userRole as CoreUserRole}
          timestamp={order.createdAt}
          isModerated={!!order.moderator}
          isFulfilled={coreOrder ? isOrderFulfilled(coreOrder) : false}
          paymentMethod={coreOrder?.contract?.paymentSent?.method?.toString()}
          totalAmount={order.total}
          currency={order.currency}
          paymentCoin={coreOrder?.contract?.paymentSent?.coin}
          onAction={handleOrderAction}
        />
      )}

      {/* Modals */}
      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-3 sm:p-4">
          <Card className="w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">
              {t('order.openDisputeTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">{t('order.openDisputeDesc')}</p>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-3 text-sm"
              placeholder={t('order.describeIssue')}
            />
            <HStack justify="end" gap="sm">
              <Button variant="ghost" size="sm" onClick={() => setShowDisputeModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleOpenDispute} disabled={isLoading}>
                {isLoading ? t('order.submitting') : t('order.submitDispute')}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Refund Confirmation AlertDialog */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order.confirmRefundTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('order.confirmRefundDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefundConfirm}>
              {t('order.refundAction')}
            </AlertDialogAction>
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
            <AlertDialogTitle>{t('order.resolveDispute')}</AlertDialogTitle>
            <AlertDialogDescription>
              {showResolveDialog === 'buyer' && t('order.resolveDisputeBuyerDesc')}
              {showResolveDialog === 'seller' && t('order.resolveDisputeSellerDesc')}
              {showResolveDialog === 'split' && t('order.resolveDisputeSplitDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolveDisputeConfirm}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Write Review Dialog */}
      <WriteReviewDialog
        open={showReviewDialog}
        productTitle={order.items[0]?.title}
        isSubmitting={isActionLoading}
        onSubmit={data => {
          executeCompleteOrder(data);
        }}
        onSkip={() => {
          if (pendingCompleteWithReview) {
            executeCompleteOrder();
          } else {
            setShowReviewDialog(false);
          }
        }}
        onClose={() => {
          setShowReviewDialog(false);
          setPendingCompleteWithReview(false);
        }}
      />
    </div>
  );
});

export default OrderDetailContent;
