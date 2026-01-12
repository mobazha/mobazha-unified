'use client';

import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@mobazha/core';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import type { Order } from './OrderCard';

// ============ Types ============

export interface OrderListCompactProps {
  /** 订单列表 */
  orders: Order[];
  /** 订单类型：购买/销售 */
  type: 'purchase' | 'sale';
  /** 查看详情回调 */
  onViewDetails: (orderId: string) => void;
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

// ============ Main Component ============

export const OrderListCompact = memo(function OrderListCompact({
  orders,
  type,
  onViewDetails,
  className,
}: OrderListCompactProps) {
  const { t } = useI18n();

  // 处理行点击
  const handleRowClick = useCallback(
    (orderId: string) => {
      onViewDetails(orderId);
    },
    [onViewDetails]
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

        return (
          <div
            key={order.id}
            className="flex gap-3 py-3 px-4 active:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => handleRowClick(order.id)}
          >
            {/* Product Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {item?.image ? (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Order Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
              {/* Top: Product name + Date */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {item?.title || 'Unknown'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {type === 'purchase' ? t('order.from') : t('order.to')} {order.vendor.name}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">
                  {formatDate(order.createdAt)}
                </span>
              </div>

              {/* Middle: Price - 增大图标尺寸 */}
              <div className="flex items-center gap-2">
                {/* Currency icon - 使用真实货币图标，显示链徽章 */}
                {(() => {
                  const { token, chainId, isToken } = parseTokenInfo(order.currency);
                  return (
                    <TokenIcon token={token} size={20} showChainBadge={isToken} chainId={chainId} />
                  );
                })()}
                <span className="text-sm font-semibold text-primary">${order.total}</span>
              </div>

              {/* Bottom: Status + Order ID - 增加间距 */}
              <div className="flex items-center justify-between mt-0.5">
                <Badge variant={status.variant} className="text-[10px] px-2 py-0.5 h-5">
                  {t(status.labelKey)}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {truncateId(order.orderId)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default OrderListCompact;
