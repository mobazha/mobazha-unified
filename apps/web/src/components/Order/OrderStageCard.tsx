'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Check, Package, CheckCircle } from 'lucide-react';

export interface OrderStageCardProps {
  /** 阶段标题 */
  title: string;
  /** 时间戳 */
  timestamp?: string;
  /** 左侧图标 */
  icon?: React.ReactNode;
  /** 详细内容 */
  children: React.ReactNode;
  /** 右侧操作按钮 */
  actions?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否显示分隔线 */
  showDivider?: boolean;
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * 订单阶段卡片组件 - 紧凑版
 *
 * 移动端规范：
 * - 标题: text-sm (14px)
 * - 正文: text-sm (14px)
 * - 辅助文字: text-xs (12px)
 * - 内边距: p-2.5 / p-3 (10-12px)
 */
export const OrderStageCard = memo(function OrderStageCard({
  title,
  timestamp,
  icon,
  children,
  actions,
  className,
  showDivider = true,
}: OrderStageCardProps) {
  return (
    <div className={cn('relative', className)}>
      {/* 分隔线 */}
      {showDivider && <div className="border-t border-border mb-2.5" />}

      {/* 标题行 */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && <div className="flex-shrink-0 text-muted-foreground">{icon}</div>}
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
        </div>
        {timestamp && (
          <span className="text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatDateTime(timestamp)}
          </span>
        )}
      </div>

      {/* 内容区域 */}
      <div className="text-sm">{children}</div>

      {/* 操作按钮 - 仅桌面端显示，移动端操作放在底部 footer */}
      {actions && <div className="mt-2 hidden lg:flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
});

/**
 * 支付信息卡片 - 紧凑版
 */
export interface PaymentCardProps {
  amount: string;
  currency: string;
  txHash?: string;
  confirmations?: number;
  timestamp?: string;
  blockchainUrl?: string;
  description?: string;
  className?: string;
}

export const PaymentCard = memo(function PaymentCard({
  amount,
  currency,
  timestamp,
  description,
  className,
  showDivider = true,
}: PaymentCardProps & { showDivider?: boolean }) {
  return (
    <OrderStageCard
      title="Order Complete"
      timestamp={timestamp}
      className={className}
      showDivider={showDivider}
    >
      <Card className="p-2.5 bg-muted/30">
        <div className="flex items-center gap-2.5">
          {/* 支付状态图标 - 移动端 28px */}
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* 支付信息 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-foreground">
              {amount} {currency}
            </p>
            <p className="text-xs text-muted-foreground">
              {description || 'Funds released to seller'}
            </p>
          </div>
        </div>
      </Card>
    </OrderStageCard>
  );
});

/**
 * 评价展示卡片 - 紧凑版
 */
export interface OrderRatingCardProps {
  vendor?: {
    name: string;
    avatar?: string;
  };
  overallRating: number;
  ratings?: {
    quality?: number;
    asAdvertised?: number;
    delivery?: number;
    service?: number;
  };
  review?: string;
  timestamp?: string;
  className?: string;
}

function StarRating({ rating, maxRating = 5 }: { rating: number; maxRating?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => (
        <svg
          key={i}
          className={cn(
            'w-2.5 h-2.5 sm:w-3 sm:h-3',
            i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'
          )}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export const OrderRatingCard = memo(function OrderRatingCard({
  vendor,
  overallRating,
  review,
  timestamp,
  className,
}: OrderRatingCardProps) {
  return (
    <OrderStageCard title="Order Complete" timestamp={timestamp} className={className}>
      <Card className="p-2.5">
        <div className="flex items-center gap-2">
          {vendor?.avatar ? (
            <img
              src={vendor.avatar}
              alt={vendor.name}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                {vendor?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground truncate">
                {vendor?.name || 'Buyer'}
              </span>
              <StarRating rating={overallRating} />
            </div>
            {review && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{review}</p>
            )}
          </div>
        </div>
      </Card>
    </OrderStageCard>
  );
});

/**
 * 发货信息卡片 - 紧凑版
 */
export interface FulfillmentCardProps {
  timestamp?: string;
  shipper?: string;
  trackingNumber?: string;
  note?: string;
  className?: string;
}

export const FulfillmentCard = memo(function FulfillmentCard({
  timestamp,
  shipper,
  trackingNumber,
  note,
  className,
  showDivider = true,
}: FulfillmentCardProps & { showDivider?: boolean }) {
  return (
    <OrderStageCard
      title="Fulfilled"
      timestamp={timestamp}
      icon={<Package className="w-4 h-4" />}
      className={className}
      showDivider={showDivider}
    >
      <Card className="p-2.5 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Package shipped</p>
            {shipper && <p className="text-xs text-muted-foreground">Carrier: {shipper}</p>}
            {trackingNumber && (
              <p className="text-xs text-muted-foreground">
                Tracking: <span className="font-mono text-primary">{trackingNumber}</span>
              </p>
            )}
            {note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note}</p>}
          </div>
        </div>
      </Card>
    </OrderStageCard>
  );
});

/**
 * 订单确认卡片 - 紧凑版
 */
export interface AcceptedCardProps {
  timestamp?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const AcceptedCard = memo(function AcceptedCard({
  timestamp,
  description,
  actions,
  className,
  showDivider = true,
}: AcceptedCardProps & { showDivider?: boolean }) {
  return (
    <OrderStageCard
      title="Accepted"
      timestamp={timestamp}
      icon={<CheckCircle className="w-4 h-4" />}
      actions={actions}
      className={className}
      showDivider={showDivider}
    >
      <Card className="p-2.5 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Order Accepted</p>
            <p className="text-xs text-muted-foreground">
              {description || "You received the order and can fulfill it whenever you're ready."}
            </p>
          </div>
        </div>
      </Card>
    </OrderStageCard>
  );
});

/**
 * 订单完成卡片 - 紧凑版
 */
export interface OrderCompleteCardProps {
  timestamp?: string;
  amount?: string;
  currency?: string;
  txUrl?: string;
  description?: string;
  className?: string;
}

export const OrderCompleteCard = memo(function OrderCompleteCard({
  timestamp,
  amount,
  currency,
  description,
  className,
  showDivider = true,
}: OrderCompleteCardProps & { showDivider?: boolean }) {
  return (
    <OrderStageCard
      title="Order Complete"
      timestamp={timestamp}
      className={className}
      showDivider={showDivider}
    >
      <Card className="p-2.5 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            {amount && currency && (
              <p className="text-sm sm:text-base font-semibold text-foreground">
                {amount} {currency}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {description || 'Funds released to seller'}
            </p>
          </div>
        </div>
      </Card>
    </OrderStageCard>
  );
});

export default OrderStageCard;
