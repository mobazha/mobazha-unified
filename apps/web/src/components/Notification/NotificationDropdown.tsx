'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  AlertTriangle,
  UserPlus,
  Settings,
  CreditCard,
  ShoppingCart,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  useNotifications,
  useUnreadNotificationCount,
  useI18n,
  useCurrency,
  getNotificationRoute,
} from '@mobazha/core';
import type { Notification } from '@mobazha/core';
import { cn } from '@/lib/utils';

/**
 * 获取通知图标
 */
function getNotificationIcon(type: string) {
  const iconClass = 'h-4 w-4';

  switch (type) {
    case 'newOrder':
      return <ShoppingCart className={cn(iconClass, 'text-info')} />;
    case 'orderFunded':
    case 'orderPaymentReceived':
      return <CreditCard className={cn(iconClass, 'text-primary')} />;
    case 'orderConfirmation':
    case 'orderCompletion':
      return <CheckCircle className={cn(iconClass, 'text-success')} />;
    case 'orderDeclined':
    case 'orderCancel':
      return <XCircle className={cn(iconClass, 'text-error')} />;
    case 'orderFulfillment':
      return <Package className={cn(iconClass, 'text-primary')} />;
    case 'disputeOpen':
    case 'caseOpen':
    case 'disputeClose':
    case 'caseUpdate':
      return <AlertTriangle className={cn(iconClass, 'text-warning')} />;
    case 'follow':
    case 'moderatorAdd':
    case 'moderatorRemove':
      return <UserPlus className={cn(iconClass, 'text-primary')} />;
    default:
      return <Bell className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

/**
 * 格式化时间
 */
function formatTimeAgo(
  timestamp: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t('time.justNow');
  if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
  return date.toLocaleDateString();
}

/**
 * 截断 Peer ID
 */
function truncatePeerId(peerId?: string): string {
  if (!peerId) return '';
  if (peerId.length <= 12) return peerId;
  return `${peerId.slice(0, 12)}...`;
}

/**
 * 通知项组件（增强版）
 */
function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
  t,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClick?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { renderPairedPrice } = useCurrency();
  const icon = getNotificationIcon(notification.type);
  const route = getNotificationRoute(notification);
  const { data, read, timestamp, type, message } = notification;

  // 是否是订单类型
  const isOrderType = [
    'newOrder',
    'orderFunded',
    'orderPaymentReceived',
    'orderConfirmation',
    'orderDeclined',
    'orderCancel',
    'refund',
    'orderFulfillment',
    'orderCompletion',
    'vendorFinalizedPayment',
  ].includes(type);

  // 是否是关注类型
  const isFollowType = ['follow', 'unfollow', 'moderatorAdd', 'moderatorRemove'].includes(type);

  const handleClick = () => {
    if (!read) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  const content = (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        read ? 'bg-transparent hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10'
      )}
      onClick={handleClick}
    >
      {/* 图标 */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {/* 主文本 */}
        <p
          className={cn(
            'text-sm leading-tight',
            read ? 'text-text-secondary' : 'text-text-primary font-medium'
          )}
        >
          {isFollowType && (data?.buyerHandle || data?.peerID) && (
            <span className="text-primary font-medium">
              {data.buyerHandle || truncatePeerId(data.peerID)}{' '}
            </span>
          )}
          {message}
        </p>

        {/* 订单商品预览 */}
        {isOrderType && data?.productTitle && (
          <div className="flex items-center gap-2 mt-1.5">
            {data.thumbnail?.small && (
              <div className="relative w-6 h-6 rounded overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={`/v1/ob/image/${data.thumbnail.small}`}
                  alt={data.productTitle}
                  className="w-full h-full object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <span className="text-xs text-text-tertiary truncate">{data.productTitle}</span>
            {data.price && (
              <span className="text-xs font-semibold text-primary flex-shrink-0">
                {renderPairedPrice(data.price.amount, data.price.currencyCode || 'USD')}
              </span>
            )}
          </div>
        )}

        {/* 时间 */}
        <p className="text-xs text-text-tertiary mt-1">{formatTimeAgo(timestamp, t)}</p>
      </div>

      {/* 标记已读按钮 */}
      {!read && (
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={e => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );

  if (route) {
    return <Link href={route}>{content}</Link>;
  }

  return content;
}

interface NotificationDropdownProps {
  className?: string;
}

/**
 * 通知下拉面板组件
 *
 * 提供更好的桌面端用户体验，点击通知图标时显示下拉面板而不是跳转页面
 */
export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();
  const { apiNotifications, isLoading, markAsRead, markAllAsRead, fetchNotifications } =
    useNotifications({
      autoLoad: false,
      enableRealtime: true,
    });

  // 打开时加载通知
  useEffect(() => {
    if (open) {
      void fetchNotifications(true);
    }
  }, [open, fetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      await markAsRead(id);
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  // 只显示最近 10 条通知
  const recentNotifications = apiNotifications.slice(0, 10);
  const hasUnread = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'hover:bg-primary/10 hover:text-primary transition-colors relative',
            className
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-error text-white text-xs font-bold rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text-primary">{t('notifications.title')}</h3>
          <div className="flex items-center gap-1">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                {t('notifications.markAllRead')}
              </Button>
            )}
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading && recentNotifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-10 w-10 text-text-tertiary mb-3" />
              <p className="text-text-secondary font-medium">
                {t('notifications.noNotifications')}
              </p>
              <p className="text-xs text-text-tertiary mt-1">{t('notifications.allCaughtUp')}</p>
            </div>
          ) : (
            <div className="p-2">
              {recentNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onClick={() => setOpen(false)}
                  t={t}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {apiNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Link href="/notifications" className="block">
                <Button
                  variant="ghost"
                  className="w-full h-9 text-sm text-primary hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  {t('notifications.viewAll')}
                </Button>
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationDropdown;
