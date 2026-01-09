'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { isOrderFulfilled, type OrderAction, type UserRole as CoreUserRole } from '@mobazha/core';
import type { Order as CoreOrder } from '@mobazha/core';
import {
  OrderFooter,
  OrderProgressBar,
  PaymentCard,
  FulfillmentCard,
  AcceptedCard,
  OrderCompleteCard,
} from '@/components/Order';
import { Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Types ============

export interface OrderItem {
  id: string;
  title: string;
  image: string;
  quantity: number;
  price: string;
  currency: string;
}

export interface OrderVendor {
  id: string;
  name: string;
  avatar: string;
  peerID?: string;
}

export interface Moderator {
  id: string;
  name: string;
  avatar: string;
  fee: number;
}

export interface TimelineEvent {
  status: string;
  timestamp: string;
  description: string;
  actor?: 'buyer' | 'seller' | 'moderator' | 'system';
}

export interface DisplayOrder {
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
  className?: string;
}

// ============ Utility Functions ============

/**
 * 根据订单状态计算进度条配置
 */
function getProgressBarState(
  status: DisplayOrder['status'],
  hasDispute?: boolean,
  hasDisputeResolution?: boolean
): { states: string[]; currentState: number; disputeState: number } {
  // 争议流程
  if (
    status === 'disputed' ||
    (hasDispute && !['completed', 'refunded', 'cancelled'].includes(status))
  ) {
    return {
      states: ['Disputed', 'Decided', 'Resolved', 'Complete'],
      currentState: status === 'disputed' ? 1 : hasDisputeResolution ? 3 : 2,
      disputeState: 1,
    };
  }

  // 取消/退款流程
  if (['cancelled', 'refunded'].includes(status)) {
    const endState =
      status === 'cancelled' ? 'Cancelled' : status === 'refunded' ? 'Refunded' : 'Declined';
    return {
      states: ['Paid', endState],
      currentState: 2,
      disputeState: 0,
    };
  }

  // 正常流程：Paid → Accepted → Fulfilled → Complete
  const normalStates = ['Paid', 'Accepted', 'Fulfilled', 'Complete'];
  let currentState = 0;

  switch (status) {
    case 'pending':
    case 'awaiting_payment':
      currentState = 0;
      break;
    case 'paid':
      currentState = 1;
      break;
    case 'processing':
      currentState = 2;
      break;
    case 'shipped':
    case 'delivered':
      currentState = 3;
      break;
    case 'completed':
      currentState = 4;
      break;
    default:
      currentState = 1;
  }

  return {
    states: normalStates,
    currentState,
    disputeState: 0,
  };
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
  className,
}: OrderDetailContentProps) {
  // 本地状态用于 UI 操作
  const [localOrder, setLocalOrder] = useState<DisplayOrder | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [trackingInfo, setTrackingInfo] = useState({ carrier: '', trackingNumber: '' });
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState<'buyer' | 'seller' | 'split' | null>(
    null
  );

  // 使用本地状态（如果有本地修改）或传入数据
  const order = localOrder || displayOrder;

  // ============ Action Handlers ============

  const handleConfirmReceipt = useCallback(async () => {
    setIsActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const updated = {
        ...order,
        status: 'completed' as const,
        timeline: [
          ...order.timeline,
          {
            status: 'completed',
            timestamp: new Date().toISOString(),
            description: 'Order completed - Funds released to seller',
            actor: 'buyer' as const,
          },
        ],
      };
      setLocalOrder(updated);
      onOrderUpdate?.(updated);
      window.alert('Order completed successfully! Funds have been released to the seller.');
      refetch?.();
    } catch (error) {
      window.alert('Failed to confirm receipt: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [order, refetch, onOrderUpdate]);

  const handleOpenDispute = useCallback(async () => {
    if (!disputeReason.trim()) {
      window.alert('Please provide a reason for the dispute');
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
            description: 'Dispute opened by buyer',
            actor: 'buyer' as const,
          },
        ],
      };
      setLocalOrder(updated);
      onOrderUpdate?.(updated);
      setShowDisputeModal(false);
      setDisputeReason('');
      window.alert('Dispute has been opened. The moderator will review your case.');
      refetch?.();
    } catch (error) {
      window.alert('Failed to open dispute: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [disputeReason, order, refetch, onOrderUpdate]);

  const handleShipOrder = useCallback(async () => {
    if (!trackingInfo.trackingNumber.trim()) {
      window.alert('Please provide tracking information');
      return;
    }
    setIsActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const updated = {
        ...order,
        status: 'shipped' as const,
        trackingNumber: trackingInfo.trackingNumber,
        timeline: [
          ...order.timeline,
          {
            status: 'shipped',
            timestamp: new Date().toISOString(),
            description: `Package shipped - ${trackingInfo.carrier}: ${trackingInfo.trackingNumber}`,
            actor: 'seller' as const,
          },
        ],
      };
      setLocalOrder(updated);
      onOrderUpdate?.(updated);
      setShowShipModal(false);
      setTrackingInfo({ carrier: '', trackingNumber: '' });
      window.alert('Order marked as shipped!');
      refetch?.();
    } catch (error) {
      window.alert('Failed to update shipping: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [trackingInfo, order, refetch, onOrderUpdate]);

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
            description: 'Order refunded by seller',
            actor: 'seller' as const,
          },
        ],
      };
      setLocalOrder(updated);
      onOrderUpdate?.(updated);
      window.alert('Refund processed successfully!');
      refetch?.();
    } catch (error) {
      window.alert('Failed to process refund: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [order, refetch, onOrderUpdate]);

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
      window.alert('Dispute has been resolved!');
      refetch?.();
    } catch (error) {
      window.alert('Failed to resolve dispute: ' + (error as Error).message);
    } finally {
      setIsActionLoading(false);
    }
  }, [showResolveDialog, order, refetch, onOrderUpdate]);

  // 统一处理订单操作（用于 OrderFooter）
  const handleOrderAction = useCallback(
    (action: OrderAction) => {
      switch (action) {
        case 'Pay':
          // 如果提供了 onPay 回调，则调用它打开支付选择器
          if (onPay) {
            onPay(order.id);
          } else {
            window.alert('Payment flow coming soon');
          }
          break;
        case 'Cancel':
          window.alert('Cancel order flow coming soon');
          break;
        case 'Dispute':
          setShowDisputeModal(true);
          break;
        case 'Complete':
          handleConfirmReceipt();
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
          setShowShipModal(true);
          break;
        case 'Refund':
          setShowRefundDialog(true);
          break;
        case 'Claim':
          window.alert('Claim payment flow coming soon');
          break;
        case 'AcceptPayout':
          window.alert('Accept payout flow coming soon');
          break;
      }
    },
    [handleConfirmReceipt, onPay, order.id]
  );

  // ============ Permission Checks ============

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

  const isLoading = isActionLoading || externalActionLoading;

  // ============ Progress Bar State ============

  const progressState = useMemo(
    () => getProgressBarState(order.status, !!order.dispute, order.dispute?.status === 'resolved'),
    [order.status, order.dispute]
  );

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Scrollable Content */}
      <div className={cn('flex-1 overflow-y-auto', inModal ? 'px-4 sm:px-6 py-4' : '')}>
        {/* Title Row */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-base sm:text-lg font-semibold text-muted-foreground">Order #:</h1>
          <span className="text-base sm:text-lg font-semibold text-foreground truncate max-w-[200px] sm:max-w-[400px]">
            {order.orderId}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(order.orderId);
            }}
            className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 touch-feedback"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="my-6 sm:my-8 px-2 sm:px-8">
          <OrderProgressBar
            states={progressState.states}
            currentState={progressState.currentState}
            disputeState={progressState.disputeState}
          />
        </div>

        {/* Dispute Banner */}
        {order.dispute && (
          <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-red-700 dark:text-red-400 mb-0.5 text-sm sm:text-base">
                  Dispute Open
                </h3>
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-300">
                  {order.dispute.claim}
                </p>
                <p className="text-[10px] sm:text-xs text-red-500 mt-0.5">
                  Initiated by {order.dispute.initiator} • Status: {order.dispute.status}
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

        {/* Stage Cards - 按时间倒序展示各阶段信息 */}
        <div className="space-y-4">
          {/* Order Complete / Rating Card */}
          {order.status === 'completed' && (
            <OrderCompleteCard
              timestamp={order.timeline.find(e => e.status === 'completed')?.timestamp}
              amount={order.total}
              currency={order.currency}
              description="Funds released to seller"
              showDivider={true}
            />
          )}

          {/* Fulfilled Card */}
          {order.trackingNumber || ['shipped', 'delivered', 'completed'].includes(order.status) ? (
            <FulfillmentCard
              timestamp={order.timeline.find(e => e.status === 'shipped')?.timestamp}
              trackingNumber={order.trackingNumber}
              showDivider={true}
            />
          ) : null}

          {/* Accepted Card */}
          {['processing', 'shipped', 'delivered', 'completed'].includes(order.status) && (
            <AcceptedCard
              timestamp={order.timeline.find(e => e.status === 'processing')?.timestamp}
              description={
                order.userRole === 'seller'
                  ? "You received the order and can fulfill it whenever you're ready."
                  : 'Order accepted by seller.'
              }
              actions={
                canShipOrder ? (
                  <Button
                    size="sm"
                    onClick={() => setShowShipModal(true)}
                    className="touch-feedback"
                  >
                    Fulfill Order
                  </Button>
                ) : undefined
              }
              showDivider={true}
            />
          )}

          {/* Payment Card */}
          {order.paymentTx && (
            <PaymentCard
              amount={order.total}
              currency={order.currency}
              txHash={order.paymentTx}
              timestamp={order.timeline.find(e => e.status === 'paid')?.timestamp}
              description="Direct payment - funds sent directly to seller."
              showDivider={true}
            />
          )}
        </div>

        {/* Order Details Section */}
        <div className="border-t border-border pt-4 mt-4">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4">Order Details</h3>

          {/* Product Info */}
          <div className="flex gap-3 sm:gap-4 mb-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
            {order.items[0]?.image && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                <img
                  src={order.items[0].image}
                  alt={order.items[0].title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground text-sm sm:text-base truncate">
                {order.items[0]?.title || 'Unknown Item'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground">Coupons</span>
                  <p className="text-foreground">n/a</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity</span>
                  <p className="text-foreground">{order.items[0]?.quantity || 1}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-muted-foreground block mb-1">Ship to</span>
              <p className="text-foreground whitespace-pre-line line-clamp-2">
                {order.shippingAddress || 'n/a'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Moderator</span>
              <p className="text-foreground">{order.moderator?.name || 'n/a'}</p>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Total</span>
              <p className="text-foreground font-semibold">
                {order.total} {order.currency}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Shipping Option</span>
              <p className="text-foreground">n/a</p>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Shipping Service</span>
              <p className="text-foreground">n/a</p>
            </div>
          </div>

          {/* Memo and Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 pt-3 border-t border-border text-xs sm:text-sm">
            <div>
              <span className="text-muted-foreground block mb-1">Memo</span>
              <p className="text-foreground">{order.notes || 'n/a'}</p>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">
                Additional Contact Information
              </span>
              <p className="text-foreground">n/a</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - 仅在 Modal 的桌面端显示，移动端使用底部 footer */}
        {inModal && (
          <div className="hidden lg:flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" className="touch-feedback">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="touch-feedback"
              >
                {isLoading ? 'Processing...' : 'Complete Order'}
              </Button>
            )}

            {canOpenDispute && (
              <Button
                variant="outline"
                size="sm"
                className="border-red-500 text-red-500 hover:bg-red-50 touch-feedback"
                onClick={() => setShowDisputeModal(true)}
              >
                Open Dispute
              </Button>
            )}

            {canShipOrder && (
              <Button
                size="sm"
                onClick={() => setShowShipModal(true)}
                disabled={isLoading}
                className="touch-feedback"
              >
                Fulfill Order
              </Button>
            )}

            {canRefund && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRefundDialog(true)}
                disabled={isLoading}
                className="touch-feedback"
              >
                Refund Order
              </Button>
            )}
          </div>
        )}

        {/* Participants Info - 在 Modal 中显示，在 Page 中单独处理 */}
        {inModal && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            {/* Seller Info */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Seller</h4>
              <HStack gap="sm" align="center">
                <Avatar
                  src={order.vendor.avatar}
                  name={order.vendor.name}
                  size="sm"
                  className="w-8 h-8"
                />
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {order.vendor.name}
                  </p>
                </div>
              </HStack>
            </div>

            {/* Buyer Info */}
            {order.buyer && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Buyer</h4>
                <HStack gap="sm" align="center">
                  <Avatar
                    src={order.buyer.avatar}
                    name={order.buyer.name}
                    size="sm"
                    className="w-8 h-8"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {order.buyer.name}
                    </p>
                  </div>
                </HStack>
              </div>
            )}

            {/* Moderator Info */}
            {order.moderator && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Moderator</h4>
                <HStack gap="sm" align="center">
                  <Avatar
                    src={order.moderator.avatar}
                    name={order.moderator.name}
                    size="sm"
                    className="w-8 h-8"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {order.moderator.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{order.moderator.fee}% fee</p>
                  </div>
                </HStack>
              </div>
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
          paymentMethod={coreOrder?.contract?.buyerOrder?.payment?.method}
          totalAmount={order.total}
          currency={order.currency}
          paymentCoin={coreOrder?.contract?.buyerOrder?.payment?.coin}
          onAction={handleOrderAction}
        />
      )}

      {/* Modals */}
      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-3 sm:p-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-3 sm:p-4">
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
});

export default OrderDetailContent;
