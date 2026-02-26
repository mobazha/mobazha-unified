'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { AvatarCompat } from '@/components/ui/avatar-compat';
import { cn } from '@/lib/utils';
import { useOrderDetail, useUserStore, useI18n } from '@mobazha/core';
import type { DisplayOrder } from '@mobazha/core';
import { OrderDetailContent } from './OrderDetailContent';
import { MessageCircle, FileJson } from 'lucide-react';

// ============ Types ============

export interface OrderDetailModalProps {
  /** 订单 ID */
  orderId: string | null;
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 订单更新后回调 */
  onOrderUpdate?: () => void;
  /** 查看上下文：从哪个视角查看（用于后备角色判断） */
  viewingContext?: 'sale' | 'purchase';
  className?: string;
}

type TabType = 'summary' | 'discussion' | 'contract';

// ============ Loading Skeleton ============

function OrderDetailSkeleton() {
  return (
    <div className="flex h-full">
      {/* 左侧边栏骨架 */}
      <div className="w-56 flex-shrink-0 border-r border-border p-4 space-y-4">
        <div className="flex flex-col items-center">
          <Skeleton variant="circular" width={80} height={80} />
          <Skeleton variant="text" width={100} height={18} className="mt-3" />
          <Skeleton variant="text" width={70} height={14} className="mt-1" />
        </div>
        <div className="pt-4 border-t border-border">
          <Skeleton variant="text" width={50} height={14} className="mb-2" />
          <div className="space-y-2">
            <Skeleton variant="rounded" width="100%" height={32} />
            <Skeleton variant="rounded" width="100%" height={32} />
            <Skeleton variant="rounded" width="100%" height={32} />
          </div>
        </div>
      </div>
      {/* 右侧内容骨架 */}
      <div className="flex-1 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton variant="text" width={60} height={20} />
          <Skeleton variant="text" width="40%" height={20} />
        </div>
        <div className="my-6 px-4">
          <Skeleton variant="rounded" width="100%" height={60} />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={32} height={32} />
                <div className="flex-1">
                  <Skeleton variant="text" width="60%" height={16} />
                  <Skeleton variant="text" width="40%" height={12} className="mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Error State ============

function OrderDetailError({ error, onRetry }: { error: string; onRetry: () => void }) {
  const { t } = useI18n();

  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/15 flex items-center justify-center">
        <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{t('order.loadOrderFailed')}</h3>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button data-testid="order-modal-retry" onClick={onRetry} size="sm">
        {t('order.tryAgain')}
      </Button>
    </div>
  );
}

// ============ Left Sidebar ============

interface OrderSidebarProps {
  order: DisplayOrder;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function OrderSidebar({ order, activeTab, onTabChange }: OrderSidebarProps) {
  const { t } = useI18n();

  // 判断用户角色，显示对应的交易对方信息
  const counterparty = order.userRole === 'buyer' ? order.vendor : order.buyer;
  const counterpartyLabel = order.userRole === 'buyer' ? t('order.seller') : t('order.buyer');

  return (
    <div className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-muted/20">
      {/* 交易对方信息 */}
      <div className="p-4 flex flex-col items-center border-b border-border bg-background/50">
        <Link
          href={counterparty?.peerID ? `/store/${counterparty.peerID}` : '#'}
          className="group flex flex-col items-center"
        >
          <div className="relative">
            <AvatarCompat
              src={counterparty?.avatar}
              name={counterparty?.name || 'Unknown'}
              size="xl"
              className="mb-3 ring-2 ring-border/50 group-hover:ring-primary/50 transition-all"
            />
          </div>
          <h3 className="text-sm font-semibold text-foreground text-center group-hover:text-primary transition-colors">
            {counterparty?.name || 'Unknown'}
          </h3>
          {counterparty?.location && (
            <p className="text-xs text-muted-foreground mt-0.5">{counterparty.location}</p>
          )}
        </Link>
        <span className="text-xs text-muted-foreground mt-1.5 px-2 py-0.5 bg-muted/50 rounded-full uppercase tracking-wide font-medium">
          {counterpartyLabel}
        </span>
      </div>

      {/* 菜单 */}
      <div className="p-3 flex-1">
        <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider mb-3 px-2">
          {t('order.menu')}
        </p>
        <nav className="space-y-1">
          <button
            data-testid="order-modal-tab-summary"
            onClick={() => onTabChange('summary')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all text-left',
              activeTab === 'summary'
                ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                : 'text-foreground hover:bg-muted/80'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {t('order.tabs.summary')}
          </button>
          <button
            data-testid="order-modal-tab-discussion"
            onClick={() => onTabChange('discussion')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all text-left',
              activeTab === 'discussion'
                ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                : 'text-foreground hover:bg-muted/80'
            )}
          >
            <MessageCircle className="w-4 h-4" />
            {t('order.tabs.discussion')}
          </button>
          <button
            data-testid="order-modal-tab-contract"
            onClick={() => onTabChange('contract')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all text-left',
              activeTab === 'contract'
                ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                : 'text-foreground hover:bg-muted/80'
            )}
          >
            <FileJson className="w-4 h-4" />
            {t('order.tabs.contract')}
          </button>
        </nav>
      </div>
    </div>
  );
}

// ============ Contract JSON Tab ============

interface ContractTabProps {
  coreOrder: unknown;
}

function ContractTab({ coreOrder }: ContractTabProps) {
  const { t } = useI18n();

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{t('order.tabs.contract')}</h3>
      <div className="bg-muted/50 rounded-lg p-3 max-h-[60vh] overflow-auto">
        <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
          {JSON.stringify(coreOrder, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ============ Discussion Tab (Placeholder) ============

function DiscussionTab() {
  const { t } = useI18n();

  return (
    <div className="p-4 flex flex-col items-center justify-center h-full min-h-[300px]">
      <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-sm font-semibold text-foreground mb-2">{t('order.tabs.discussion')}</h3>
      <p className="text-xs text-muted-foreground text-center">
        {t('order.discussionPlaceholder')}
      </p>
    </div>
  );
}

// ============ Main Component ============

export const OrderDetailModal = memo(function OrderDetailModal({
  orderId,
  open,
  onClose,
  onOrderUpdate,
  viewingContext,
  className,
}: OrderDetailModalProps) {
  const { t } = useI18n();
  const router = useRouter();

  // 当前激活的标签页
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Bug Fix: 存储 timeout ID 以便在组件卸载时清理
  const resetTabTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 获取当前用户信息（用于传递给 OrderDetailContent）
  const currentUser = useUserStore(state => state.profile);
  const currentUserPeerID = currentUser?.peerID || null;

  // 使用统一的 useOrderDetail hook 获取和转换订单数据
  const {
    displayOrder,
    coreOrder,
    isLoading: orderLoading,
    error: orderError,
    refetch,
  } = useOrderDetail(orderId || '', viewingContext);

  // Bug Fix: 清理 timeout 防止内存泄漏
  React.useEffect(() => {
    return () => {
      if (resetTabTimeoutRef.current) {
        clearTimeout(resetTabTimeoutRef.current);
      }
    };
  }, []);

  // 处理 Dialog 打开状态变化
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose();
        // 延迟重置标签页，避免在关闭动画期间触发重渲染
        // Bug Fix: 存储 timeout ID 以便清理
        resetTabTimeoutRef.current = setTimeout(() => setActiveTab('summary'), 100);
      }
    },
    [onClose]
  );

  // 处理订单更新
  const handleOrderUpdate = useCallback(() => {
    refetch();
    onOrderUpdate?.();
  }, [refetch, onOrderUpdate]);

  // 处理支付 - 跳转到支付页面
  const handlePay = useCallback(
    (payOrderId: string) => {
      // 关闭 Modal 并跳转到支付页面
      onClose();
      router.push(`/payment?orderID=${payOrderId}`);
    },
    [router, onClose]
  );

  // 处理关闭 - ESC 键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 处理开立争议
  const handleOpenDispute = useCallback(() => {
    // TODO: 实现开立争议功能

    console.warn('Open dispute not implemented yet for order:', orderId);
  }, [orderId]);

  // 将 DisplayOrder 转换为 OrderDetailContent 需要的格式
  const contentDisplayOrder = displayOrder as
    | Parameters<typeof OrderDetailContent>[0]['displayOrder']
    | null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="order-detail-modal"
        className={cn('max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col', className)}
      >
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg font-semibold">
            {t('order.orderDetails')}
          </DialogTitle>
        </DialogHeader>

        {/* Content - 左右分栏布局 */}
        <div className="flex-1 flex overflow-hidden">
          {orderLoading && <OrderDetailSkeleton />}

          {orderError && (
            <div className="flex-1">
              <OrderDetailError error={orderError} onRetry={refetch} />
            </div>
          )}

          {!orderLoading && !orderError && contentDisplayOrder && (
            <>
              {/* 左侧边栏 */}
              <OrderSidebar
                order={contentDisplayOrder}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {/* 右侧主内容区 */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'summary' && (
                  <OrderDetailContent
                    displayOrder={contentDisplayOrder}
                    coreOrder={coreOrder}
                    currentUserPeerID={currentUserPeerID}
                    inModal={true}
                    showFooter={false}
                    refetch={refetch}
                    onOrderUpdate={() => handleOrderUpdate()}
                    onClose={onClose}
                    onPay={handlePay}
                    onOpenDispute={handleOpenDispute}
                  />
                )}
                {activeTab === 'discussion' && <DiscussionTab />}
                {activeTab === 'contract' && <ContractTab coreOrder={coreOrder} />}
              </div>
            </>
          )}

          {!orderLoading && !orderError && !displayOrder && (
            <div className="flex-1 p-8 text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('order.orderNotFound')}
              </h3>
              <p className="text-sm text-muted-foreground">{t('order.orderNotFoundMessage')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default OrderDetailModal;
