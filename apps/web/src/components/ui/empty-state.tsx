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
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      )}
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
  return (
    <EmptyState
      icon={Package}
      title="暂无商品"
      description="您还没有创建任何商品。开始创建您的第一个商品吧！"
      action={onCreateProduct ? { label: '创建商品', onClick: onCreateProduct } : undefined}
      secondaryAction={onBrowse ? { label: '浏览市场', onClick: onBrowse } : undefined}
    />
  );
}

/**
 * 空购物车
 */
export function EmptyCart({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="购物车是空的"
      description="您的购物车中还没有商品。快去挑选您喜欢的商品吧！"
      action={onBrowse ? { label: '开始购物', onClick: onBrowse } : undefined}
    />
  );
}

/**
 * 无消息
 */
export function NoMessages({ onStartChat }: { onStartChat?: () => void }) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="暂无消息"
      description="您还没有任何对话记录。开始与卖家或买家聊天吧！"
      action={onStartChat ? { label: '开始聊天', onClick: onStartChat } : undefined}
    />
  );
}

/**
 * 无通知
 */
export function NoNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="暂无通知"
      description="您目前没有任何通知。当有新消息或订单更新时，我们会通知您。"
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
  const titles = {
    all: '暂无订单',
    purchases: '暂无购买记录',
    sales: '暂无销售记录',
  };

  const descriptions = {
    all: '您还没有任何订单记录。',
    purchases: '您还没有购买过任何商品。快去看看有什么好东西吧！',
    sales: '您还没有任何销售记录。继续推广您的商品吧！',
  };

  return (
    <EmptyState
      icon={FileText}
      title={titles[type]}
      description={descriptions[type]}
      action={
        type === 'purchases' && onBrowse ? { label: '浏览商品', onClick: onBrowse } : undefined
      }
    />
  );
}

/**
 * 搜索无结果
 */
export function NoSearchResults({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="未找到结果"
      description={
        query
          ? `没有找到与 "${query}" 相关的结果。请尝试其他关键词。`
          : '没有找到匹配的结果。请尝试调整搜索条件。'
      }
      action={onClear ? { label: '清除搜索', onClick: onClear } : undefined}
    />
  );
}

/**
 * 无关注者/关注
 */
export function NoFollowers({ type = 'followers' }: { type?: 'followers' | 'following' }) {
  return (
    <EmptyState
      icon={Users}
      title={type === 'followers' ? '暂无关注者' : '暂未关注任何人'}
      description={
        type === 'followers'
          ? '还没有人关注您。分享您的店铺来获得更多关注者吧！'
          : '您还没有关注任何卖家。发现并关注您感兴趣的卖家吧！'
      }
    />
  );
}

/**
 * 无收藏
 */
export function NoFavorites({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={Heart}
      title="暂无收藏"
      description="您还没有收藏任何商品。浏览并收藏您喜欢的商品吧！"
      action={onBrowse ? { label: '浏览商品', onClick: onBrowse } : undefined}
    />
  );
}

/**
 * 钱包为空
 */
export function EmptyWallet({ onDeposit }: { onDeposit?: () => void }) {
  return (
    <EmptyState
      icon={Wallet}
      title="钱包余额为零"
      description="您的钱包目前没有余额。充值以开始交易。"
      action={onDeposit ? { label: '充值', onClick: onDeposit } : undefined}
    />
  );
}

/**
 * 无店铺
 */
export function NoStore({ onSetup }: { onSetup?: () => void }) {
  return (
    <EmptyState
      icon={Store}
      title="还没有店铺"
      description="您还没有设置店铺。创建您的店铺，开始销售商品吧！"
      action={onSetup ? { label: '设置店铺', onClick: onSetup } : undefined}
    />
  );
}

/**
 * 无历史记录
 */
export function NoHistory() {
  return (
    <EmptyState icon={Clock} title="暂无历史记录" description="您还没有任何浏览或活动记录。" />
  );
}

/**
 * 无争议/仲裁案件
 */
export function NoDisputes() {
  return (
    <EmptyState icon={Shield} title="暂无争议案件" description="目前没有需要处理的争议案件。" />
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
