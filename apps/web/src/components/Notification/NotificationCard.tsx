'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ChevronRight,
} from 'lucide-react';
import {
  useI18n,
  useCurrency,
  getImageUrl as coreGetImageUrl,
  formatUserName,
  formatNotificationCounterparty,
  getNotificationCtaKey,
  getNotificationRoute,
} from '@mobazha/core';
import type { Notification as ApiNotification } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============ 类型定义 ============

interface NotificationCardProps {
  notification: ApiNotification;
  onClick?: () => void;
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
    case 'order.rated':
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

function getMarketplaceReviewStatusIcon(status?: string): React.ReactNode {
  if (status === 'approved') {
    return <CheckCircle className="h-5 w-5 text-success" />;
  }
  if (status === 'rejected') {
    return <XCircle className="h-5 w-5 text-error" />;
  }
  if (status === 'suspended') {
    return <AlertTriangle className="h-5 w-5 text-warning" />;
  }
  return <Clock className="h-5 w-5 text-muted-foreground" />;
}

/**
 * Format peer identity for notification display.
 */
function formatPeerDisplay(peerId?: string, handle?: string): string {
  return formatUserName({ name: handle, peerID: peerId }, { fallback: '' });
}

function NotificationCtaButton({
  route,
  labelKey,
  onNavigate,
}: {
  route: string;
  labelKey: string;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="h-8 text-xs mt-2"
      onClick={e => e.stopPropagation()}
    >
      <Link href={route} onClick={onNavigate}>
        {t(labelKey)}
        <ChevronRight className="h-3.5 w-3.5 ml-1" />
      </Link>
    </Button>
  );
}

// ============ Avatar with fallback ============

function NotificationAvatar({
  avatarHash,
  name,
  fallback,
  containerClassName,
}: {
  avatarHash?: string;
  name?: string;
  fallback: React.ReactNode;
  containerClassName?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = avatarHash && !imgFailed;

  return (
    <div
      className={cn(
        'flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden',
        containerClassName
      )}
    >
      {showImg ? (
        <img
          src={getImageUrl(avatarHash) || ''}
          alt={name || 'User'}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

function OrderNotificationAvatar({
  avatarHash,
  name,
  type,
}: {
  avatarHash?: string;
  name?: string;
  type: string;
}) {
  return (
    <NotificationAvatar avatarHash={avatarHash} name={name} fallback={getNotificationIcon(type)} />
  );
}

// ============ 订单通知卡片 ============

interface OrderNotificationCardProps extends NotificationCardProps {
  route?: string | null;
}

export function OrderNotificationCard({
  notification,
  onClick,
  route,
  className,
  showCta = true,
}: OrderNotificationCardProps & { showCta?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const { renderPairedPrice } = useCurrency();
  const { data, read, timestamp, type, message } = notification;

  const thumbnail = data?.thumbnail?.small || data?.thumbnail?.tiny;
  const productTitle = data?.productTitle;
  const price = data?.price;
  const counterpartyAvatar = data?.buyerAvatar || data?.vendorAvatar;
  const counterpartyName = formatNotificationCounterparty(data, t);
  const ctaKey = showCta && route ? getNotificationCtaKey(type) : null;

  const handleClick = () => {
    onClick?.();
    if (route) {
      router.push(route);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 sm:p-4 min-h-[56px] rounded-lg cursor-pointer transition-all',
        !read ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-transparent hover:bg-muted/50',
        className
      )}
      onClick={handleClick}
    >
      <OrderNotificationAvatar
        avatarHash={counterpartyAvatar}
        name={counterpartyName}
        type={type}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {counterpartyName && (
                <span
                  className={cn(
                    'font-medium text-sm',
                    read ? 'text-text-secondary' : 'text-text-primary'
                  )}
                >
                  {counterpartyName}
                </span>
              )}
              <span className={cn('text-sm', read ? 'text-text-tertiary' : 'text-text-secondary')}>
                {message}
              </span>
            </div>

            {(thumbnail || productTitle) && (
              <div className="flex items-center gap-2 mt-2">
                {thumbnail && (
                  <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={getImageUrl(thumbnail) || ''}
                      alt={productTitle || t('notifications.productFallback')}
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
                      {price.currencyCode
                        ? renderPairedPrice(price.amount, price.currencyCode)
                        : '—'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {route && ctaKey && (
              <NotificationCtaButton route={route} labelKey={ctaKey} onNavigate={onClick} />
            )}
          </div>

          <span className="text-xs text-text-tertiary flex-shrink-0">
            {formatTimeAgo(timestamp, t)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============ 聚合订单通知卡片 ============

interface AggregatedOrderNotificationCardProps {
  orderID: string;
  items: ApiNotification[];
  latest: ApiNotification;
  hasUnread: boolean;
  route?: string | null;
  onClick?: () => void;
  className?: string;
}

export function AggregatedOrderNotificationCard({
  orderID,
  items,
  latest,
  hasUnread,
  route,
  onClick,
  className,
}: AggregatedOrderNotificationCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { renderPairedPrice } = useCurrency();
  const { data, type, message, timestamp } = latest;
  const productTitle = data?.productTitle;
  const price = data?.price;
  const counterpartyName = formatNotificationCounterparty(data, t);
  const ctaKey = route ? getNotificationCtaKey(type) : null;
  const recentEvents = items.slice(0, 3);

  const handleClick = () => {
    onClick?.();
    if (route) {
      router.push(route);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 sm:p-4 min-h-[56px] rounded-lg cursor-pointer transition-all',
        hasUnread ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-transparent hover:bg-muted/50',
        className
      )}
      onClick={handleClick}
    >
      <OrderNotificationAvatar
        avatarHash={data?.buyerAvatar || data?.vendorAvatar}
        name={counterpartyName}
        type={type}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-primary mb-1">
              {t('notifications.orderGroup.label', { count: items.length })}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {counterpartyName && (
                <span
                  className={cn(
                    'font-medium text-sm',
                    hasUnread ? 'text-text-primary' : 'text-text-secondary'
                  )}
                >
                  {counterpartyName}
                </span>
              )}
              <span
                className={cn('text-sm', hasUnread ? 'text-text-secondary' : 'text-text-tertiary')}
              >
                {message}
              </span>
            </div>

            {productTitle && (
              <p className="text-sm text-text-secondary truncate mt-1">{productTitle}</p>
            )}
            {price?.currencyCode && (
              <p className="text-sm font-semibold text-primary mt-0.5">
                {renderPairedPrice(price.amount, price.currencyCode)}
              </p>
            )}

            <ul className="mt-2 space-y-1">
              {recentEvents.map(item => (
                <li key={item.id} className="text-xs text-text-tertiary truncate">
                  {!item.read && <span className="text-primary mr-1">•</span>}
                  {item.message}
                </li>
              ))}
            </ul>

            {items.length > 3 && (
              <p className="text-xs text-text-tertiary mt-1">
                {t('notifications.orderGroup.moreUpdates', { count: items.length - 3 })}
              </p>
            )}

            {route && ctaKey && (
              <NotificationCtaButton route={route} labelKey={ctaKey} onNavigate={onClick} />
            )}
          </div>

          <span className="text-xs text-text-tertiary flex-shrink-0">
            {formatTimeAgo(timestamp, t)}
          </span>
        </div>
        <p className="text-[11px] text-text-tertiary mt-1 truncate">
          {t('notifications.orderGroup.orderRef', { orderId: orderID.slice(0, 8) })}
        </p>
      </div>
    </div>
  );
}

// ============ 关注通知卡片 ============

export function FollowNotificationCard({
  notification,
  onClick,
  route,
  className,
}: OrderNotificationCardProps) {
  const { t } = useI18n();
  const { data, read, timestamp, type } = notification;

  const avatarHash = data?.avatarHashes?.small || data?.avatarHashes?.tiny;
  const handle = data?.buyerName || data?.vendorName;
  const peerId = data?.peerID;

  const handleClick = () => {
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
      <NotificationAvatar
        avatarHash={avatarHash}
        name={handle}
        fallback={<User className="h-5 w-5 text-primary" />}
        containerClassName="bg-primary/10"
      />

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
  route,
  className,
}: OrderNotificationCardProps) {
  const { t } = useI18n();
  const { data, read, timestamp } = notification;

  const disputerName = data?.disputerName;
  const disputerID = data?.disputerID;
  const orderID = data?.orderID;

  const handleClick = () => {
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
        {(disputerName || disputerID) && (
          <p className="text-xs text-text-tertiary mt-1">
            {t('common.by')}{' '}
            {formatUserName(
              { name: disputerName, peerID: disputerID },
              { fallback: t('notifications.roles.user') }
            )}
          </p>
        )}
        {orderID && (
          <p className="text-xs text-text-tertiary">
            {t('notifications.orderGroup.orderRef', { orderId: orderID.slice(0, 8) })}
          </p>
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

export function MarketplaceReviewNotificationCard({
  notification,
  onClick,
  route,
  className,
}: OrderNotificationCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { data, read, timestamp, message } = notification;
  const review = data?.marketplaceReview;
  const timeAgoText = formatTimeAgo(timestamp, t);
  const accessibleLabel = `${message} ${timeAgoText}`;

  const handleClick = () => {
    onClick?.();
    if (route) {
      router.push(route);
    }
  };

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      className={cn(
        'w-full text-left flex items-start gap-3 p-3 sm:p-4 min-h-[56px] rounded-lg transition-all',
        !read ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-transparent hover:bg-muted/50',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        {getMarketplaceReviewStatusIcon(review?.status)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={cn(
                'text-sm',
                read ? 'text-text-secondary' : 'text-text-primary font-medium'
              )}
            >
              {message}
            </p>
          </div>
          <span className="text-xs text-text-tertiary flex-shrink-0">{timeAgoText}</span>
        </div>
      </div>
    </button>
  );
}

// ============ 通用通知卡片 ============

export function NotificationCard({ notification, onClick, className }: NotificationCardProps) {
  const { type, source } = notification;

  if (source === 'marketplace-review') {
    return (
      <MarketplaceReviewNotificationCard
        notification={notification}
        onClick={onClick}
        route={getNotificationRoute(notification)}
        className={className}
      />
    );
  }

  // 根据通知类型选择合适的卡片组件
  const isOrderNotification = type.startsWith('order.') || type.startsWith('payment.');

  const isFollowNotification = type.startsWith('social.');

  const isDisputeNotification = type.startsWith('dispute.');

  if (isOrderNotification) {
    return (
      <OrderNotificationCard notification={notification} onClick={onClick} className={className} />
    );
  }

  if (isFollowNotification) {
    return (
      <FollowNotificationCard notification={notification} onClick={onClick} className={className} />
    );
  }

  if (isDisputeNotification) {
    return (
      <DisputeNotificationCard
        notification={notification}
        onClick={onClick}
        className={className}
      />
    );
  }

  // 默认卡片
  return (
    <OrderNotificationCard notification={notification} onClick={onClick} className={className} />
  );
}

export default NotificationCard;
