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
import { useI18n } from '@mobazha/core';
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
  onAccept?: (orderId: string) => void;
  /** 拒绝订单回调 */
  onReject?: (orderId: string) => void;
  className?: string;
}

// ============ Status Config ============

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color?: string }
> = {
  pending: {
    label: 'Pending',
    variant: 'outline',
    color: 'text-yellow-600 border-yellow-300 bg-yellow-50',
  },
  awaiting_payment: {
    label: 'Awaiting Payment',
    variant: 'outline',
    color: 'text-yellow-600 border-yellow-300 bg-yellow-50',
  },
  paid: { label: 'Paid', variant: 'default', color: 'bg-blue-500' },
  processing: { label: 'Processing', variant: 'default', color: 'bg-blue-500' },
  shipped: { label: 'Fulfilled', variant: 'default', color: 'bg-purple-500' },
  delivered: { label: 'Delivered', variant: 'default', color: 'bg-emerald-500' },
  completed: { label: 'Complete', variant: 'default', color: 'bg-emerald-500' },
  disputed: { label: 'Disputed', variant: 'destructive' },
  refunded: { label: 'Refunded', variant: 'secondary' },
  cancelled: { label: 'Declined', variant: 'secondary' },
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

  // 判断是否需要显示操作按钮
  const shouldShowActions = useCallback(
    (status: string) => {
      // 销售订单且状态为 pending 时显示 Accept/Reject
      return type === 'sale' && status === 'pending';
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
            <TableHead className="w-[130px]">ORDER ID</TableHead>
            <TableHead className="w-[160px]">DATE</TableHead>
            <TableHead className="w-[200px]">LISTING</TableHead>
            <TableHead className="w-[140px]">{type === 'purchase' ? 'SELLER' : 'BUYER'}</TableHead>
            <TableHead className="w-[100px] text-right">TOTAL</TableHead>
            <TableHead className="w-[180px]">STATUS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map(order => {
            const status = statusConfig[order.status] || {
              label: order.status,
              variant: 'secondary' as const,
            };
            const showActions = shouldShowActions(order.status);

            return (
              <TableRow
                key={order.id}
                className="cursor-pointer"
                onClick={() => handleRowClick(order.id)}
              >
                {/* ORDER ID */}
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground">{truncateId(order.orderId)}</span>
                    <button
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={e => handleButtonClick(e, () => copyToClipboard(order.orderId))}
                      title="Copy Order ID"
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
                    {order.items[0]?.image && (
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={order.items[0].image}
                          alt={order.items[0].title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {order.items[0]?.title || 'Unknown'}
                    </span>
                  </div>
                </TableCell>

                {/* BUYER/SELLER */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {order.vendor.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-foreground truncate max-w-[80px]">
                      {truncateId(order.vendor.name || order.vendor.id, 10)}
                    </span>
                  </div>
                </TableCell>

                {/* TOTAL */}
                <TableCell className="text-right">
                  <span className="font-semibold text-foreground">${order.total}</span>
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
                          onClick={e => handleButtonClick(e, () => onReject?.(order.id))}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs bg-emerald-500 hover:bg-emerald-600"
                          onClick={e => handleButtonClick(e, () => onAccept?.(order.id))}
                        >
                          Accept
                        </Button>
                      </>
                    ) : (
                      <Badge variant={status.variant} className={cn('text-xs', status.color)}>
                        {status.label}
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
