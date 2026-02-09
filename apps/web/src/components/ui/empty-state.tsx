'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@mobazha/core';
import {
  Package,
  ShoppingCart,
  MessageSquare,
  Bell,
  Users,
  Search,
  Wallet,
  FileText,
  Store,
  Heart,
  Clock,
  Shield,
  type LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

/**
 * 通用空状态组件
 */
export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-muted-foreground max-w-sm mb-6">{description}</p>}
      {children}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && <Button onClick={action.onClick}>{action.label}</Button>}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// 预定义的空状态变体

/**
 * 无商品
 */
export function NoProducts({
  onCreateProduct,
  onBrowse,
}: {
  onCreateProduct?: () => void;
  onBrowse?: () => void;
}) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Package}
      title={t('emptyState.noProducts.title')}
      description={t('emptyState.noProducts.description')}
      action={
        onCreateProduct
          ? { label: t('emptyState.noProducts.createProduct'), onClick: onCreateProduct }
          : undefined
      }
      secondaryAction={
        onBrowse ? { label: t('emptyState.noProducts.browseMarket'), onClick: onBrowse } : undefined
      }
    />
  );
}

/**
 * 空购物车
 */
export function EmptyCart({ onBrowse }: { onBrowse?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={ShoppingCart}
      title={t('emptyState.emptyCart.title')}
      description={t('emptyState.emptyCart.description')}
      action={
        onBrowse ? { label: t('emptyState.emptyCart.startShopping'), onClick: onBrowse } : undefined
      }
    />
  );
}

/**
 * 无消息
 */
export function NoMessages({ onStartChat }: { onStartChat?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={MessageSquare}
      title={t('emptyState.noMessages.title')}
      description={t('emptyState.noMessages.description')}
      action={
        onStartChat
          ? { label: t('emptyState.noMessages.startChat'), onClick: onStartChat }
          : undefined
      }
    />
  );
}

/**
 * 无通知
 */
export function NoNotifications() {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Bell}
      title={t('emptyState.noNotifications.title')}
      description={t('emptyState.noNotifications.description')}
    />
  );
}

/**
 * 无订单
 */
export function NoOrders({
  type = 'all',
  onBrowse,
}: {
  type?: 'all' | 'purchases' | 'sales';
  onBrowse?: () => void;
}) {
  const { t } = useI18n();
  const titles = {
    all: t('emptyState.noOrders.allTitle'),
    purchases: t('emptyState.noOrders.purchasesTitle'),
    sales: t('emptyState.noOrders.salesTitle'),
  };

  const descriptions = {
    all: t('emptyState.noOrders.allDescription'),
    purchases: t('emptyState.noOrders.purchasesDescription'),
    sales: t('emptyState.noOrders.salesDescription'),
  };

  return (
    <EmptyState
      icon={FileText}
      title={titles[type]}
      description={descriptions[type]}
      action={
        type === 'purchases' && onBrowse
          ? { label: t('emptyState.noOrders.browseProducts'), onClick: onBrowse }
          : undefined
      }
    />
  );
}

/**
 * 搜索无结果
 */
export function NoSearchResults({ query, onClear }: { query?: string; onClear?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Search}
      title={t('emptyState.noSearchResults.title')}
      description={
        query
          ? t('emptyState.noSearchResults.descriptionWithQuery', { query })
          : t('emptyState.noSearchResults.description')
      }
      action={
        onClear
          ? { label: t('emptyState.noSearchResults.clearSearch'), onClick: onClear }
          : undefined
      }
    />
  );
}

/**
 * 无关注者/关注
 */
export function NoFollowers({ type = 'followers' }: { type?: 'followers' | 'following' }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Users}
      title={
        type === 'followers'
          ? t('emptyState.noFollowers.followersTitle')
          : t('emptyState.noFollowers.followingTitle')
      }
      description={
        type === 'followers'
          ? t('emptyState.noFollowers.followersDescription')
          : t('emptyState.noFollowers.followingDescription')
      }
    />
  );
}

/**
 * 无收藏
 */
export function NoFavorites({ onBrowse }: { onBrowse?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Heart}
      title={t('emptyState.noFavorites.title')}
      description={t('emptyState.noFavorites.description')}
      action={
        onBrowse
          ? { label: t('emptyState.noFavorites.browseProducts'), onClick: onBrowse }
          : undefined
      }
    />
  );
}

/**
 * 钱包为空
 */
export function EmptyWallet({ onDeposit }: { onDeposit?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Wallet}
      title={t('emptyState.emptyWallet.title')}
      description={t('emptyState.emptyWallet.description')}
      action={
        onDeposit ? { label: t('emptyState.emptyWallet.deposit'), onClick: onDeposit } : undefined
      }
    />
  );
}

/**
 * 无店铺
 */
export function NoStore({ onSetup }: { onSetup?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Store}
      title={t('emptyState.noStore.title')}
      description={t('emptyState.noStore.description')}
      action={onSetup ? { label: t('emptyState.noStore.setupStore'), onClick: onSetup } : undefined}
    />
  );
}

/**
 * 无历史记录
 */
export function NoHistory() {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Clock}
      title={t('emptyState.noHistory.title')}
      description={t('emptyState.noHistory.description')}
    />
  );
}

/**
 * 无争议/仲裁案件
 */
export function NoDisputes() {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Shield}
      title={t('emptyState.noDisputes.title')}
      description={t('emptyState.noDisputes.description')}
    />
  );
}

/**
 * 加载错误状态
 */
export function LoadError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      title={t('common.loadFailed')}
      description={message || t('common.loadFailedDesc')}
      action={onRetry ? { label: t('common.retry'), onClick: onRetry } : undefined}
    />
  );
}
