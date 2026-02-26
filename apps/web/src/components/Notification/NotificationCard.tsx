'use client';

import React from 'react';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  UserPlus,
  AlertTriangle,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  User,
} from 'lucide-react';
import { useI18n, useCurrency } from '@mobazha/core';
import type { Notification as ApiNotification } from '@mobazha/core';
import { cn } from '@/lib/utils';

// ============ 类型定义 ============

interface NotificationCardProps {
  notification: ApiNotification;
  onClick?: () => void;
  onMarkAsRead?: (id: string) => void;
  className?: string;
}

// ============ 辅助函数 ============

/**
 * 获取网关图片 URL
 */
function getImageUrl(hash?: string): string | null {
  if (!hash) return null;
  return `/v1/media/images/${hash}`;
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
 * 获取通知图标
 */
function getNotificationIcon(type: string): React.ReactNode {
  const iconClass = 'h-5 w-5';

  switch (type) {
    case 'newOrder':
      return <ShoppingCart className={cn(iconClass, 'text-info')} />;
    case 'orderFunded':
    case 'orderPaymentReceived':
      return <CreditCard className={cn(iconClass, 'text-primary')} />;
    case 'orderConfirmation':
      return <CheckCircle className={cn(iconClass, 'text-success')} />;
    case 'orderDeclined':
    case 'orderCancel':
      return <XCircle className={cn(iconClass, 'text-error')} />;
    case 'orderFulfillment':
      return <Package className={cn(iconClass, 'text-primary')} />;
    case 'orderCompletion':
      return <CheckCircle className={cn(iconClass, 'text-primary')} />;
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
      return <Clock className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

/**
 * Format peer identity for notification display.
 * Returns empty string instead of "Unknown" when no data is available.
 */
function formatPeerDisplay(peerId?: string, handle?: string): string {
  if (handle) return handle;
  if (!peerId) return '';
  if (peerId.length <= 12) return peerId;
  return `${peerId.slice(0, 8)}…${peerId.slice(-4)}`;
}

// ============ 订单通知卡片 ============

interface OrderNotificationCardProps extends NotificationCardProps {
  route?: string | null;
}

export function OrderNotificationCard({
  notification,
  onClick,
  onMarkAsRead,
  route,
  className,
}: OrderNotificationCardProps) {
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();
  const { data, read, timestamp, type } = notification;

  const thumbnail = data?.thumbnail?.small || data?.thumbnail?.tiny;
  const productTitle = data?.productTitle;
  const price = data?.price;
  const buyerHandle = data?.buyerHandle;
  const buyerId = data?.buyerId;

  const handleClick = () => {
    if (!read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all',
        !read ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-transparent hover:bg-muted/50',
        className
      )}
      onClick={handleClick}
    >
      {/* 图标 */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        {getNotificationIcon(type)}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {/* 标题行 */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium text-sm',
              read ? 'text-text-secondary' : 'text-text-primary'
            )}
          >
            {buyerHandle || formatPeerDisplay(buyerId)}
          </span>
          <span className={cn('text-sm', read ? 'text-text-tertiary' : 'text-text-secondary')}>
            {notification.message}
          </span>
        </div>

        {/* 商品预览 */}
        {(thumbnail || productTitle) && (
          <div className="flex items-center gap-2 mt-2">
            {thumbnail && (
              <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={getImageUrl(thumbnail) || ''}
                  alt={productTitle || 'Product'}
                  className="w-full h-full object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {productTitle && (
                <p className="text-sm text-text-secondary truncate">{productTitle}</p>
              )}
              {price && (
                <p className="text-sm font-semibold text-primary">
                  {renderPairedPrice(price.amount, price.currencyCode || 'USD')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 时间戳 */}
      <span className="text-xs text-text-tertiary flex-shrink-0">
        {formatTimeAgo(timestamp, t)}
      </span>
    </div>
  );

  if (route) {
    return <Link href={route}>{content}</Link>;
  }

  return content;
}

// ============ 关注通知卡片 ============

export function FollowNotificationCard({
  notification,
  onClick,
  onMarkAsRead,
  route,
  className,
}: OrderNotificationCardProps) {
  const { t } = useI18n();
  const { data, read, timestamp, type } = notification;

  const avatarHash = data?.avatarHashes?.small || data?.avatarHashes?.tiny;
  const handle = data?.buyerHandle || data?.vendorHandle;
  const peerId = data?.peerID;

  const handleClick = () => {
    if (!read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  const content = (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
        !read ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-transparent hover:bg-muted/50',
        className
      )}
      onClick={handleClick}
    >
      {/* 头像 */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
        {avatarHash ? (
          <img
            src={getImageUrl(avatarHash) || ''}
            alt={handle || 'User'}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
              // 显示默认图标
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.innerHTML =
                  '<svg class="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
              }
            }}
          />
        ) : (
          <User className="h-5 w-5 text-primary" />
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', read ? 'text-text-secondary' : 'text-text-primary')}>
          <span className="font-medium text-primary">{handle || formatPeerDisplay(peerId)}</span>{' '}
          {type === 'follow'
            ? t('notifications.social.startedFollowing')
            : t('notifications.social.unfollowed')}
        </p>
      </div>

      {/* 时间戳 */}
      <span className="text-xs text-text-tertiary flex-shrink-0">
        {formatTimeAgo(timestamp, t)}
      </span>
    </div>
  );

  if (route) {
    return <Link href={route}>{content}</Link>;
  }

  return content;
}

// ============ 争议通知卡片 ============

export function DisputeNotificationCard({
  notification,
  onClick,
  onMarkAsRead,
  route,
  className,
}: OrderNotificationCardProps) {
  const { t } = useI18n();
  const { data, read, timestamp } = notification;

  const disputerHandle = data?.disputerHandle;
  const disputerId = data?.disputerId;
  const orderId = data?.orderId;

  const handleClick = () => {
    if (!read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all',
        !read ? 'bg-warning/8 border-l-4 border-l-warning' : 'bg-transparent hover:bg-muted/50',
        className
      )}
      onClick={handleClick}
    >
      {/* 图标 */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-warning" />
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p
          className={cn('text-sm', read ? 'text-text-secondary' : 'text-text-primary font-medium')}
        >
          {notification.message}
        </p>
        {(disputerHandle || disputerId) && (
          <p className="text-xs text-text-tertiary mt-1">
            {t('common.by')} {disputerHandle || formatPeerDisplay(disputerId)}
          </p>
        )}
        {orderId && <p className="text-xs text-text-tertiary">Order #{orderId.slice(0, 8)}</p>}
      </div>

      {/* 时间戳 */}
      <span className="text-xs text-text-tertiary flex-shrink-0">
        {formatTimeAgo(timestamp, t)}
      </span>
    </div>
  );

  if (route) {
    return <Link href={route}>{content}</Link>;
  }

  return content;
}

// ============ 通用通知卡片 ============

export function NotificationCard({
  notification,
  onClick,
  onMarkAsRead,
  className,
}: NotificationCardProps) {
  const { type } = notification;

  // 根据通知类型选择合适的卡片组件
  const isOrderNotification = [
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

  const isFollowNotification = ['follow', 'unfollow', 'moderatorAdd', 'moderatorRemove'].includes(
    type
  );

  const isDisputeNotification = [
    'disputeOpen',
    'disputeClose',
    'disputeAccepted',
    'caseOpen',
    'caseUpdate',
  ].includes(type);

  if (isOrderNotification) {
    return (
      <OrderNotificationCard
        notification={notification}
        onClick={onClick}
        onMarkAsRead={onMarkAsRead}
        className={className}
      />
    );
  }

  if (isFollowNotification) {
    return (
      <FollowNotificationCard
        notification={notification}
        onClick={onClick}
        onMarkAsRead={onMarkAsRead}
        className={className}
      />
    );
  }

  if (isDisputeNotification) {
    return (
      <DisputeNotificationCard
        notification={notification}
        onClick={onClick}
        onMarkAsRead={onMarkAsRead}
        className={className}
      />
    );
  }

  // 默认卡片
  return (
    <OrderNotificationCard
      notification={notification}
      onClick={onClick}
      onMarkAsRead={onMarkAsRead}
      className={className}
    />
  );
}

export default NotificationCard;
