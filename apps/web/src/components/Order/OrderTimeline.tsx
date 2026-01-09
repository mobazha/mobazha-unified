'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Package, CheckCircle, AlertCircle, RefreshCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';

/**
 * 时间线项目类型
 */
export interface TimelineItem {
  type: 'complete' | 'fulfilled' | 'accepted' | 'disputed' | 'refunded' | 'decided' | 'resolved';
  timestamp: string;
  data?: {
    // OrderComplete
    amount?: string;
    currency?: string;
    rating?: number;
    review?: string;
    buyerName?: string;
    // Fulfilled
    trackingNumber?: string;
    shipper?: string;
    note?: string;
    // Accepted
    description?: string;
    // Disputed
    claim?: string;
    status?: string;
    // Refunded
    refundAmount?: string;
    txHash?: string;
  };
  /** 操作按钮（桌面端显示在阶段项右侧） */
  actions?: React.ReactNode;
}

export interface OrderTimelineProps {
  items: TimelineItem[];
  className?: string;
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
 * 星级评分组件
 */
function StarRating({ rating, maxRating = 5 }: { rating: number; maxRating?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => (
        <svg
          key={i}
          className={cn(
            'w-3 h-3',
            i < rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-muted-foreground/30 fill-muted-foreground/30'
          )}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * 时间线单项组件
 */
const TimelineItemRow = memo(function TimelineItemRow({
  item,
  isLast,
}: {
  item: TimelineItem;
  isLast: boolean;
}) {
  const { type, timestamp, data, actions } = item;

  // 根据类型获取图标和标题
  const getIconAndTitle = () => {
    switch (type) {
      case 'complete':
        return {
          icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
          title: 'Order Complete',
          bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        };
      case 'fulfilled':
        return {
          icon: <Package className="w-3.5 h-3.5 text-blue-600" />,
          title: 'Fulfilled',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        };
      case 'accepted':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
          title: 'Accepted',
          bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        };
      case 'disputed':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />,
          title: 'Disputed',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
        };
      case 'refunded':
        return {
          icon: <RefreshCcw className="w-3.5 h-3.5 text-orange-600" />,
          title: 'Refunded',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        };
      case 'decided':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5 text-purple-600" />,
          title: 'Decided',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        };
      case 'resolved':
        return {
          icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
          title: 'Resolved',
          bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        };
      default:
        return {
          icon: <Check className="w-3.5 h-3.5" />,
          title: 'Unknown',
          bgColor: 'bg-muted',
        };
    }
  };

  const { icon, title, bgColor } = getIconAndTitle();

  // 渲染内容
  const renderContent = () => {
    switch (type) {
      case 'complete':
        return (
          <Card className="p-2.5 bg-muted/30 mt-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                  bgColor
                )}
              >
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {data?.amount} {data?.currency}
                  </span>
                  {data?.rating && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <StarRating rating={data.rating} />
                    </>
                  )}
                </div>
                {data?.review && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    &ldquo;{data.review}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </Card>
        );

      case 'fulfilled':
        return (
          <Card className="p-2.5 bg-muted/30 mt-1.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                  bgColor
                )}
              >
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Package shipped</p>
                {data?.trackingNumber && (
                  <p className="text-xs text-muted-foreground">
                    Tracking: <span className="font-mono text-primary">{data.trackingNumber}</span>
                  </p>
                )}
                {data?.note && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    Note: {data.note}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );

      case 'accepted':
        return (
          <Card className="p-2.5 bg-muted/30 mt-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    bgColor
                  )}
                >
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Order Accepted</p>
                  <p className="text-xs text-muted-foreground">
                    {data?.description ||
                      "You received the order and can fulfill it whenever you're ready."}
                  </p>
                </div>
              </div>
              {/* 桌面端操作按钮 */}
              {actions && <div className="hidden sm:flex flex-shrink-0">{actions}</div>}
            </div>
          </Card>
        );

      case 'disputed':
        return (
          <Card className="p-2.5 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mt-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    bgColor
                  )}
                >
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Dispute opened
                  </p>
                  {data?.claim && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{data.claim}</p>
                  )}
                </div>
              </div>
              {actions && <div className="hidden sm:flex flex-shrink-0">{actions}</div>}
            </div>
          </Card>
        );

      case 'refunded':
        return (
          <Card className="p-2.5 bg-muted/30 mt-1.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                  bgColor
                )}
              >
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Refunded {data?.refundAmount}</p>
                {data?.txHash && (
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    TX: {data.txHash}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );

      case 'decided':
      case 'resolved':
        return (
          <Card className="p-2.5 bg-muted/30 mt-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    bgColor
                  )}
                >
                  {icon}
                </span>
                <p className="text-sm font-medium">
                  {type === 'decided' ? 'Dispute decided' : 'Dispute resolved'}
                </p>
              </div>
              {actions && <div className="hidden sm:flex flex-shrink-0">{actions}</div>}
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('py-2', !isLast && 'border-b border-border')}>
      {/* 标题行 */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {formatDateTime(timestamp)}
        </span>
      </div>

      {/* 内容区域 */}
      {renderContent()}
    </div>
  );
});

/**
 * 订单时间线组件 - 紧凑列表式
 *
 * 去掉卡片包裹，用分隔线分隔各阶段，与原版桌面端保持一致
 * 支持在每个阶段显示操作按钮（桌面端显示在右侧，移动端在底部 footer）
 */
export const OrderTimeline = memo(function OrderTimeline({ items, className }: OrderTimelineProps) {
  if (!items || items.length === 0) {
    return null;
  }

  // 按时间倒序排列
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className={cn('', className)}>
      {sortedItems.map((item, index) => (
        <TimelineItemRow
          key={`${item.type}-${item.timestamp}`}
          item={item}
          isLast={index === sortedItems.length - 1}
        />
      ))}
    </div>
  );
});

export default OrderTimeline;
