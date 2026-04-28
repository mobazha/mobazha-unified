'use client';

import React, { useState } from 'react';
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
import { useI18n, useCurrency, getImageUrl as coreGetImageUrl } from '@mobazha/core';
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

function getImageUrl(hash?: string): string | null {
  if (!hash) return null;
  return coreGetImageUrl(hash) ?? null;
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
    case 'order.created':
      return <ShoppingCart className={cn(iconClass, 'text-info')} />;
    case 'order.funded':
    case 'order.payment_received':
    case 'payment.locked':
      return <CreditCard className={cn(iconClass, 'text-primary')} />;
    case 'order.confirmed':
      return <CheckCircle className={cn(iconClass, 'text-success')} />;
    case 'order.declined':
    case 'order.cancelled':
    case 'order.expired':
    case 'payment.expired':
    case 'payment.cancelled':
      return <XCircle className={cn(iconClass, 'text-error')} />;
    case 'order.stale_warning':
      return <AlertTriangle className={cn(iconClass, 'text-warning')} />;
    case 'order.shipped':
      return <Package className={cn(iconClass, 'text-primary')} />;
    case 'order.completed':
      return <CheckCircle className={cn(iconClass, 'text-primary')} />;
    case 'dispute.opened':
    case 'dispute.case_open':
    case 'dispute.closed':
    case 'dispute.case_update':
      return <AlertTriangle className={cn(iconClass, 'text-warning')} />;
    case 'social.follow':
    case 'social.unfollow':
    case 'social.moderator_add':
    case 'social.moderator_remove':
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

// ============ Avatar with fallback ============

function OrderNotificationAvatar({
  avatarHash,
  name,
  type,
}: {
  avatarHash?: string;
  name?: string;
  type: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const showImg = avatarHash && !imgFailed;

  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
      {showImg ? (
        <img
          src={getImageUrl(avatarHash) || ''}
          alt={name || 'User'}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        getNotificationIcon(type)
      )}
    </div>
  );
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
  const buyerName = data?.buyerName;
  const buyerId = data?.buyerId;
  const vendorName = data?.vendorName;
  const vendorId = data?.vendorId;
  const counterpartyAvatar = data?.buyerAvatar || data?.vendorAvatar;
  const counterpartyName = buyerName || vendorName || formatPeerDisplay(buyerId || vendorId);

  const handleClick = () => {
    if (!read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 sm:p-4 min-h-[56px] rounded-lg cursor-pointer transition-all',
        !read ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-transparent hover:bg-muted/50',
        className
      )}
      onClick={handleClick}
    >
      {/* 头像或图标 */}
      <OrderNotificationAvatar
        avatarHash={counterpartyAvatar}
        name={counterpartyName}
        type={type}
      />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {/* 标题行 */}
        <div className="flex items-center gap-2">
          {counterpartyName && (
            <span
              className={cn(
                'font-medium text-sm flex-shrink-0',
                read ? 'text-text-secondary' : 'text-text-primary'
              )}
            >
              {counterpartyName}
            </span>
          )}
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
                  {price.currencyCode ? renderPairedPrice(price.amount, price.currencyCode) : '—'}
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
  const handle = data?.buyerName || data?.vendorName;
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
        'flex items-center gap-3 p-3 sm:p-4 min-h-[56px] rounded-lg cursor-pointer transition-all',
        !read ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-transparent hover:bg-muted/50',
        className
      )}
      onClick={handleClick}
    >
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
          {type === 'social.follow'
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

  const disputerName = data?.disputerName;
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
        'flex items-start gap-3 p-3 sm:p-4 min-h-[56px] rounded-lg cursor-pointer transition-all',
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
        {(disputerName || disputerId) && (
          <p className="text-xs text-text-tertiary mt-1">
            {t('common.by')} {disputerName || formatPeerDisplay(disputerId)}
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
  const isOrderNotification = type.startsWith('order.') || type.startsWith('payment.');

  const isFollowNotification = type.startsWith('social.');

  const isDisputeNotification = type.startsWith('dispute.');

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
