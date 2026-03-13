'use client';

import React, { memo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProductImageNative } from '@/components/ui/product-image';
import { useI18n, useCurrency } from '@mobazha/core';
import { Copy } from 'lucide-react';
import type { Order } from './OrderCard';

// ============ Types ============

export interface OrderTableProps {
  /** 订单列表 */
  orders: Order[];
  /** 订单类型：购买/销售 */
  type: 'purchase' | 'sale';
  /** 查看详情回调 */
  onViewDetails: (orderId: string) => void;
  /** 联系对方回调 */
  onContact?: (peerId: string) => void;
  /** 接受订单回调 */
  onAccept?: (orderId: string, paymentCoin?: string) => void;
  /** 拒绝订单回调 */
  onReject?: (orderId: string, paymentCoin?: string) => void;
  className?: string;
}

// ============ Status Config ============

// 状态对应的 i18n key 和样式
const statusConfig: Record<
  string,
  { labelKey: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color?: string }
> = {
  pending: {
    labelKey: 'order.pending',
    variant: 'outline',
    color: 'text-warning border-warning/20 bg-warning/15',
  },
  awaiting_payment: {
    labelKey: 'order.statusLabels.awaitingPayment',
    variant: 'outline',
    color: 'text-warning border-warning/20 bg-warning/15',
  },
  paid: { labelKey: 'order.paid', variant: 'default', color: 'bg-info' },
  processing: { labelKey: 'order.processing', variant: 'default', color: 'bg-info' },
  shipped: { labelKey: 'order.shipped', variant: 'default', color: 'bg-primary' },
  delivered: { labelKey: 'order.delivered', variant: 'default', color: 'bg-primary' },
  completed: { labelKey: 'order.completed', variant: 'default', color: 'bg-primary' },
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
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function truncateId(id: string, length: number = 10): string {
  if (!id) return '';
  if (id.length <= length) return id;
  return id.slice(0, length) + '...';
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}

// ============ Main Component ============

export const OrderTable = memo(function OrderTable({
  orders,
  type,
  onViewDetails,
  onContact: _onContact,
  onAccept,
  onReject,
  className,
}: OrderTableProps) {
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();

  // 判断是否需要显示操作按钮
  // 只有原始状态为 PENDING（已付款等待确认）的销售订单才显示 Accept/Reject
  // AWAITING_PAYMENT（等待付款）状态不应显示这些按钮
  const shouldShowActions = useCallback(
    (rawState?: string) => {
      // 销售订单且原始状态为 PENDING（已付款待确认）时显示 Accept/Reject
      return type === 'sale' && rawState === 'PENDING';
    },
    [type]
  );

  // 处理行点击
  const handleRowClick = useCallback(
    (orderId: string) => {
      onViewDetails(orderId);
    },
    [onViewDetails]
  );

  // 处理按钮点击（阻止冒泡）
  const handleButtonClick = useCallback((e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
  }, []);

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[130px]">{t('order.table.orderId')}</TableHead>
            <TableHead className="w-[160px]">{t('order.table.date')}</TableHead>
            <TableHead className="w-[200px]">{t('order.table.listing')}</TableHead>
            <TableHead className="w-[140px]">
              {type === 'purchase' ? t('order.seller') : t('order.buyer')}
            </TableHead>
            <TableHead className="w-[100px] text-right">{t('order.table.total')}</TableHead>
            <TableHead className="w-[180px]">{t('order.table.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map(order => {
            const status = statusConfig[order.status] || {
              labelKey: 'order.statusLabels.unknown',
              variant: 'secondary' as const,
            };
            const showActions = shouldShowActions(order.rawState);

            return (
              <TableRow
                key={order.id}
                className="cursor-pointer"
                tabIndex={0}
                role="link"
                aria-label={`${t('order.table.orderId')} ${truncateId(order.orderId)}`}
                onClick={() => handleRowClick(order.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(order.id);
                  }
                }}
              >
                {/* ORDER ID */}
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground">{truncateId(order.orderId)}</span>
                    <button
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={e => handleButtonClick(e, () => copyToClipboard(order.orderId))}
                      aria-label={t('order.actions.copyOrderId')}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </TableCell>

                {/* DATE */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(order.createdAt)}
                </TableCell>

                {/* LISTING */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                      <ProductImageNative
                        src={order.items[0]?.image}
                        alt={order.items[0]?.title ?? ''}
                        iconSize="sm"
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {order.items[0]?.title || t('order.unknownItem')}
                    </span>
                  </div>
                </TableCell>

                {/* BUYER/SELLER */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {order.vendor.avatar ? (
                      <img
                        src={order.vendor.avatar}
                        alt={order.vendor.name}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        onError={e => {
                          // 头像加载失败时显示首字母占位
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-7 h-7 rounded-full bg-primary/20 items-center justify-center text-primary text-xs font-medium flex-shrink-0"
                      style={{ display: order.vendor.avatar ? 'none' : 'flex' }}
                    >
                      {order.vendor.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-foreground truncate max-w-[80px]">
                      {order.vendor.name || truncateId(order.vendor.id, 10)}
                    </span>
                  </div>
                </TableCell>

                {/* TOTAL */}
                <TableCell className="text-right">
                  <span className="font-semibold text-foreground">
                    {formatCurrencyPrice(order.total, order.currency || 'USD')}
                  </span>
                </TableCell>

                {/* STATUS */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {showActions ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={e =>
                            handleButtonClick(e, () => onReject?.(order.id, order.paymentCoin))
                          }
                        >
                          {t('order.actions.decline')}
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"
                          onClick={e =>
                            handleButtonClick(e, () => onAccept?.(order.id, order.paymentCoin))
                          }
                        >
                          {t('order.actions.accept')}
                        </Button>
                      </>
                    ) : (
                      <Badge variant={status.variant} className={cn('text-xs', status.color)}>
                        {t(status.labelKey)}
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t('order.noOrdersFound')}</p>
        </div>
      )}
    </div>
  );
});

export default OrderTable;
