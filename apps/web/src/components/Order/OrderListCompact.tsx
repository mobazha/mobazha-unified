'use client';

import React, { memo, useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useI18n,
  useCurrency,
  getChainFromCoin,
  getTokenByPaymentCoin,
  resolveOrderStatusLabelKey,
} from '@mobazha/core';
import { ProductImageNative } from '@/components/ui/product-image';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import { MessageCircle, CheckCircle2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import type { Order } from './OrderCard';
import { OrderSettlementBadge } from './OrderSettlementBadge';

// ============ Types ============

export interface OrderListCompactProps {
  /** 订单列表 */
  orders: Order[];
  /** 订单类型：购买/销售 */
  type: 'purchase' | 'sale';
  /** 查看详情回调 */
  onViewDetails: (orderId: string) => void;
  /** 接受订单回调 */
  onAccept?: (orderId: string, paymentCoin?: string, paymentEscrowType?: string) => void;
  /** 拒绝订单回调 */
  onReject?: (orderId: string, paymentCoin?: string, paymentEscrowType?: string) => void;
  /** 联系对方回调 */
  onContact?: (vendorId: string, displayName?: string) => void;
  /** 确认收货回调（买家视角） */
  onConfirmDelivery?: (orderId: string) => void;
  className?: string;
}

// ============ Status Config ============

// Semantic color mapping using theme tokens (works across all 6 themes × light/dark)
const statusConfig: Record<string, { labelKey: string; className: string }> = {
  awaiting_payment: {
    labelKey: 'order.statusLabels.awaitingPayment',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  pending: {
    labelKey: 'order.pending',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  paid: {
    labelKey: 'order.confirmed',
    className: 'bg-info/15 text-info border-info/30',
  },
  processing: {
    labelKey: 'order.processing',
    className: 'bg-info/15 text-info border-info/30',
  },
  shipped: {
    labelKey: 'order.shipped',
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  delivered: {
    labelKey: 'order.delivered',
    className: 'bg-success/15 text-success border-success/30',
  },
  completed: {
    labelKey: 'order.completed',
    className: 'bg-success/15 text-success border-success/30',
  },
  disputed: {
    labelKey: 'order.disputed',
    className: 'bg-error/15 text-error border-error/30',
  },
  refunded: {
    labelKey: 'order.refunded',
    className: 'bg-muted text-muted-foreground border-transparent',
  },
  cancelled: {
    labelKey: 'order.cancelled',
    className: 'bg-muted text-muted-foreground border-transparent',
  },
};

// ============ Utility Functions ============

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

// 从支付币种中提取图标与链信息（兼容 legacy 与 canonical 格式）
function parseTokenInfo(currency: string): { token: string; chainId?: string; isToken: boolean } {
  if (!currency) return { token: 'USD', isToken: false };

  const normalizedToken = getTokenByPaymentCoin(currency)?.id || currency.toUpperCase();
  const chainId = getChainFromCoin(currency) || undefined;
  const isToken = !!chainId && normalizedToken.toUpperCase() !== chainId.toUpperCase();

  return {
    token: normalizedToken,
    chainId,
    isToken,
  };
}

// ============ Swipeable Order Row ============

function SwipeableOrderRow({
  children,
  showSwipeActions,
  onContact,
  onConfirmDelivery,
}: {
  children: React.ReactNode;
  showSwipeActions: boolean;
  onContact?: () => void;
  onConfirmDelivery?: () => void;
}) {
  const { t } = useI18n();
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const actionWidth = onConfirmDelivery && onContact ? 120 : 60;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!showSwipeActions) return;
      startX.current = e.touches[0].clientX;
      setDragging(true);
    },
    [showSwipeActions]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging || !showSwipeActions) return;
      const dx = e.touches[0].clientX - startX.current;
      if (dx < 0) {
        setOffsetX(Math.max(dx, -actionWidth));
      } else {
        setOffsetX(0);
      }
    },
    [dragging, showSwipeActions, actionWidth]
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    if (offsetX < -actionWidth / 2) {
      setOffsetX(-actionWidth);
    } else {
      setOffsetX(0);
    }
  }, [offsetX, actionWidth]);

  if (!showSwipeActions) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Swipe action buttons behind */}
      <div className="absolute inset-y-0 right-0 flex">
        {onContact && (
          <button
            onClick={e => {
              e.stopPropagation();
              onContact();
              setOffsetX(0);
            }}
            className="w-[60px] bg-primary flex flex-col items-center justify-center gap-1"
            aria-label={t('order.actions.chat')}
          >
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
            <span className="text-xs text-primary-foreground font-medium">
              {t('order.actions.chat')}
            </span>
          </button>
        )}
        {onConfirmDelivery && (
          <button
            onClick={e => {
              e.stopPropagation();
              onConfirmDelivery();
              setOffsetX(0);
            }}
            className="w-[60px] bg-success flex flex-col items-center justify-center gap-1"
            aria-label={t('order.actions.confirmDelivery')}
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span className="text-xs text-white font-medium">
              {t('order.actions.confirmDelivery')}
            </span>
          </button>
        )}
      </div>

      {/* Foreground row */}
      <div
        className="relative bg-background"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// ============ Main Component ============

export const OrderListCompact = memo(function OrderListCompact({
  orders,
  type,
  onViewDetails,
  onAccept,
  onReject,
  onContact,
  onConfirmDelivery,
  className,
}: OrderListCompactProps) {
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();

  const handleRowClick = useCallback(
    (orderId: string) => {
      onViewDetails(orderId);
    },
    [onViewDetails]
  );

  const handleButtonClick = useCallback((e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
  }, []);

  const shouldShowActions = useCallback(
    (rawState?: string) => type === 'sale' && rawState === 'PENDING',
    [type]
  );

  // Swipe actions: contact for all orders, confirm delivery for shipped purchases
  const getSwipeActions = useCallback(
    (order: Order) => {
      const canConfirm =
        type === 'purchase' && (order.status === 'shipped' || order.status === 'delivered');
      return {
        showSwipe: !!(onContact || (canConfirm && onConfirmDelivery)),
        contactCb: onContact ? () => onContact(order.vendor.id) : undefined,
        confirmCb: canConfirm && onConfirmDelivery ? () => onConfirmDelivery(order.id) : undefined,
      };
    },
    [type, onContact, onConfirmDelivery]
  );

  if (orders.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-sm">{t('order.noOrdersFound')}</p>
      </div>
    );
  }

  return (
    <div className={cn('divide-y divide-border', className)}>
      {orders.map(order => {
        const status = statusConfig[order.status] || {
          labelKey: 'order.status.unknown',
          className: 'bg-muted text-muted-foreground border-transparent',
        };
        const statusLabelKey = resolveOrderStatusLabelKey(
          order.status,
          order.contractType,
          status.labelKey
        );
        const item = order.items[0];
        const showActions = shouldShowActions(order.rawState);
        const showPayAction = type === 'purchase' && order.rawState === 'AWAITING_PAYMENT';
        const { showSwipe, contactCb, confirmCb } = getSwipeActions(order);

        return (
          <SwipeableOrderRow
            key={order.id}
            showSwipeActions={showSwipe}
            onContact={contactCb}
            onConfirmDelivery={confirmCb}
          >
            <div
              className="flex flex-col gap-2 py-3 px-4 active:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleRowClick(order.id)}
            >
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <ProductImageNative src={item?.image} alt={item?.title ?? ''} iconSize="md" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {item?.title || t('order.untitledItem')}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {type === 'purchase' ? t('order.from') : t('order.to')}
                        </span>
                        {order.vendor.avatar ? (
                          <img
                            src={order.vendor.avatar}
                            alt={order.vendor.name}
                            className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-primary font-medium">
                              {order.vendor.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground truncate">
                          {order.vendor.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const { token, chainId, isToken } = parseTokenInfo(order.currency);
                      return (
                        <TokenIcon
                          token={token}
                          size={20}
                          showChainBadge={isToken}
                          chainId={chainId}
                        />
                      );
                    })()}
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrencyPrice(order.total, order.currency || 'USD')}
                    </span>
                  </div>

                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-xs px-2 py-0.5 h-5', status.className)}
                    >
                      {t(statusLabelKey)}
                    </Badge>
                    <OrderSettlementBadge
                      settlementState={order.settlementState}
                      settlementAction={order.settlementAction}
                      settlementActionId={order.settlementActionId}
                      settlementTxHash={order.settlementTxHash}
                    />
                  </div>
                </div>
              </div>

              {showActions && (onAccept || onReject) && (
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {onReject && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px] px-3 text-sm flex-1 min-w-0"
                      onClick={e =>
                        handleButtonClick(e, () =>
                          onReject(order.id, order.paymentCoin, order.paymentEscrowType)
                        )
                      }
                    >
                      {t('order.actions.decline')}
                    </Button>
                  )}
                  {onAccept && (
                    <Button
                      size="sm"
                      className="min-h-[44px] px-3 text-sm flex-1 min-w-0 bg-primary hover:bg-primary/90"
                      onClick={e =>
                        handleButtonClick(e, () =>
                          onAccept(order.id, order.paymentCoin, order.paymentEscrowType)
                        )
                      }
                    >
                      {t('order.actions.accept')}
                    </Button>
                  )}
                </div>
              )}

              {showPayAction && (
                <div onClick={e => e.stopPropagation()}>
                  <Link href={`/payment?orderID=${order.orderId}`} className="block">
                    <Button
                      size="sm"
                      className="w-full min-h-[44px] text-sm pointer-events-none"
                      tabIndex={-1}
                      data-testid="order-compact-continue-payment"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      {t('payment.payNow')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </SwipeableOrderRow>
        );
      })}
    </div>
  );
});

export default OrderListCompact;
