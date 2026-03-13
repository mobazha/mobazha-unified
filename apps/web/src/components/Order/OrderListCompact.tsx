'use client';

import React, { memo, useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n, useCurrency } from '@mobazha/core';
import { ProductImageNative } from '@/components/ui/product-image';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import { MessageCircle, CheckCircle2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import type { Order } from './OrderCard';

// ============ Types ============

export interface OrderListCompactProps {
  /** 订单列表 */
  orders: Order[];
  /** 订单类型：购买/销售 */
  type: 'purchase' | 'sale';
  /** 查看详情回调 */
  onViewDetails: (orderId: string) => void;
  /** 接受订单回调 */
  onAccept?: (orderId: string, paymentCoin?: string) => void;
  /** 拒绝订单回调 */
  onReject?: (orderId: string, paymentCoin?: string) => void;
  /** 联系对方回调 */
  onContact?: (vendorId: string) => void;
  /** 确认收货回调（买家视角） */
  onConfirmDelivery?: (orderId: string) => void;
  className?: string;
}

// ============ Status Config ============

// 状态对应的 i18n key 和样式
const statusConfig: Record<
  string,
  { labelKey: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { labelKey: 'order.pending', variant: 'outline' },
  awaiting_payment: { labelKey: 'order.pending', variant: 'outline' },
  paid: { labelKey: 'order.confirmed', variant: 'default' },
  processing: { labelKey: 'order.processing', variant: 'default' },
  shipped: { labelKey: 'order.shipped', variant: 'default' },
  delivered: { labelKey: 'order.delivered', variant: 'default' },
  completed: { labelKey: 'order.completed', variant: 'secondary' },
  disputed: { labelKey: 'order.disputed', variant: 'destructive' },
  refunded: { labelKey: 'order.refunded', variant: 'secondary' },
  cancelled: { labelKey: 'order.cancelled', variant: 'secondary' },
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

function truncateId(id: string, length: number = 8): string {
  if (!id) return '';
  if (id.length <= length) return id;
  return '#' + id.slice(0, length) + '...';
}

// 从货币代码中提取链信息
// 例如: ETHUSDT -> { token: 'ETHUSDT', chainId: 'ETH', isToken: true }
// 例如: BTC -> { token: 'BTC', chainId: undefined, isToken: false }
function parseTokenInfo(currency: string): { token: string; chainId?: string; isToken: boolean } {
  if (!currency) return { token: 'USD', isToken: false };

  const upperCurrency = currency.toUpperCase();

  // 检查是否是链上代币 (ETHUSDT, SOLUSDT, BSCUSDT, etc.)
  const chainPrefixes = ['ETH', 'SOL', 'BSC', 'MATIC', 'BASE'];
  const tokenSuffixes = ['USDT', 'USDC', 'DAI', 'BUSD'];

  for (const prefix of chainPrefixes) {
    for (const suffix of tokenSuffixes) {
      if (upperCurrency === prefix + suffix) {
        return { token: upperCurrency, chainId: prefix, isToken: true };
      }
    }
  }

  // 原生代币或法币
  return { token: upperCurrency, isToken: false };
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
          variant: 'secondary' as const,
        };
        const item = order.items[0];
        const showActions = shouldShowActions(order.rawState);
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
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrencyPrice(order.total, order.currency || 'USD')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <Badge variant={status.variant} className="text-xs px-2 py-0.5 h-5">
                      {t(status.labelKey)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {truncateId(order.orderId)}
                    </span>
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
                        handleButtonClick(e, () => onReject(order.id, order.paymentCoin))
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
                        handleButtonClick(e, () => onAccept(order.id, order.paymentCoin))
                      }
                    >
                      {t('order.actions.accept')}
                    </Button>
                  )}
                </div>
              )}

              {type === 'purchase' && order.rawState === 'AWAITING_PAYMENT' && (
                <div onClick={e => e.stopPropagation()}>
                  <Link href={`/payment?orderID=${order.orderId}`} className="block">
                    <Button
                      size="sm"
                      className="w-full min-h-[44px] text-sm pointer-events-none"
                      tabIndex={-1}
                      data-testid="order-compact-continue-payment"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      {t('payment.continuePayment')}
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
