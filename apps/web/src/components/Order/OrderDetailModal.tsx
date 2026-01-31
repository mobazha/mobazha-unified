'use client';

import React, { memo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { cn } from '@/lib/utils';
import { useOrderDetail, useUserStore, useI18n } from '@mobazha/core';
import type { DisplayOrder } from '@mobazha/core';
import { OrderDetailContent } from './OrderDetailContent';

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

// ============ Loading Skeleton ============

function OrderDetailSkeleton() {
  return (
    <div className="p-4 sm:p-6">
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
      <div className="border-t border-border pt-4 mt-4">
        <Skeleton variant="text" width={100} height={20} className="mb-4" />
        <div className="flex gap-4">
          <Skeleton variant="rectangular" width={80} height={80} className="rounded-lg" />
          <div className="flex-1">
            <Skeleton variant="text" width="70%" height={18} />
            <Skeleton variant="text" width="40%" height={14} className="mt-2" />
          </div>
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
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <Button onClick={onRetry} size="sm">
        {t('order.tryAgain')}
      </Button>
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

  // 将 DisplayOrder 转换为 OrderDetailContent 需要的格式
  // 注意：OrderDetailContent 期望的 DisplayOrder 类型与 core 包的类型相同
  const contentDisplayOrder = displayOrder as
    | Parameters<typeof OrderDetailContent>[0]['displayOrder']
    | null;

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent
        className={cn('max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col', className)}
      >
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg font-semibold">
            {t('order.orderDetails')}
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {orderLoading && <OrderDetailSkeleton />}

          {orderError && <OrderDetailError error={orderError} onRetry={refetch} />}

          {!orderLoading && !orderError && contentDisplayOrder && (
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
            />
          )}

          {!orderLoading && !orderError && !displayOrder && (
            <div className="p-8 text-center">
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
