'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/layouts';
import { Loader2 } from 'lucide-react';
import {
  useI18n,
  getOrderActions,
  getPrimaryAction,
  getSecondaryActions,
  getActionButtonConfig,
  isOrderExpired,
  type OrderAction,
  type UserRole,
  type OrderState,
} from '@mobazha/core';

export interface OrderFooterProps {
  orderState: OrderState;
  userRole: UserRole;
  timestamp: string;
  isModerated?: boolean;
  isShipped?: boolean;
  paymentMethod?: string;
  fundsReleasedAtConfirmation?: boolean;
  totalAmount?: string;
  currency?: string;
  paymentCoin?: string;
  hasRated?: boolean;
  inAfterSaleWindow?: boolean;
  hasAfterSaleDispute?: boolean;
  contractType?: string;
  hasPreconfiguredDigitalAssets?: boolean;
  digitalDeliveryStatus?: string | null;
  canSyncDigitalDelivery?: boolean;
  canRetryDigitalDelivery?: boolean;
  manualDigitalFallbackAllowed?: boolean;
  isTransitioning?: boolean;
  onAction: (action: OrderAction) => void;
  onOpenDiscussion?: () => void;
  className?: string;
}

/**
 * 订单操作底栏组件
 * 根据订单状态和用户角色显示可用操作按钮
 */
export const OrderFooter: React.FC<OrderFooterProps> = ({
  orderState,
  userRole,
  timestamp,
  isModerated = false,
  isShipped = false,
  paymentMethod,
  fundsReleasedAtConfirmation = false,
  totalAmount,
  currency,
  paymentCoin,
  hasRated,
  inAfterSaleWindow = false,
  hasAfterSaleDispute = false,
  contractType,
  hasPreconfiguredDigitalAssets = false,
  digitalDeliveryStatus,
  canSyncDigitalDelivery = false,
  canRetryDigitalDelivery = false,
  manualDigitalFallbackAllowed = false,
  isTransitioning = false,
  onAction,
  onOpenDiscussion,
  className = '',
}) => {
  const { t } = useI18n();

  if (orderState === 'DISPUTED' && onOpenDiscussion) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border shadow-lg z-50 safe-area-inset-bottom ${className}`}
      >
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <HStack justify="between" align="center" className="max-w-screen-xl mx-auto gap-3">
            <span className="text-xs sm:text-sm font-medium text-warning truncate">
              {t('order.footer.disputeReviewing')}
            </span>
            <Button
              size="sm"
              onClick={onOpenDiscussion}
              className="h-11 sm:h-10 rounded-full font-semibold"
              data-testid="order-footer-open-discussion"
            >
              {t('order.actions.openDiscussion')}
            </Button>
          </HStack>
        </div>
      </div>
    );
  }

  // 检查是否过期
  const expired = isOrderExpired(timestamp);

  // 获取可用操作
  const actions = getOrderActions(orderState, userRole, {
    isModerated,
    isShipped,
    isExpired: expired,
    paymentMethod,
    hasRated,
    inAfterSaleWindow,
    hasAfterSaleDispute,
    fundsReleasedAtConfirmation,
  });
  const visibleActions = actions.filter(action => action !== 'Dispute');

  // 没有可用操作时：如果正在过渡则显示过渡条，否则不显示
  if (visibleActions.length === 0 && !isTransitioning) {
    return null;
  }

  const primaryAction = getPrimaryAction(visibleActions);
  const secondaryActions = getSecondaryActions(visibleActions);

  // 获取操作标签（支持国际化）
  const getActionLabel = (action: OrderAction): string => {
    const labelMap: Record<OrderAction, string> = {
      Pay: t('order.actions.pay'),
      Cancel: t('order.actions.cancel'),
      Dispute: t('order.actions.dispute'),
      AfterSaleDispute: t('order.actions.reportIssue'),
      Complete: t('order.actions.complete'),
      WriteReview: t('order.actions.writeReview'),
      Accept: t('order.actions.accept'),
      Decline: t('order.actions.decline'),
      Ship:
        contractType === 'DIGITAL_GOOD'
          ? canSyncDigitalDelivery
            ? t('order.actions.syncDelivery')
            : canRetryDigitalDelivery
              ? t('order.actions.retryDigitalDelivery')
              : manualDigitalFallbackAllowed
                ? t('order.actions.deliverDigital')
                : t('order.actions.deliveryPending')
          : t('order.actions.ship'),
      Refund: t('order.actions.refund'),
      Claim: t('order.actions.claim'),
      AcceptPayout: t('order.actions.acceptPayout'),
    };
    return labelMap[action] || action;
  };

  const renderDisputeCountdown = () => null;

  // 渲染价格信息（仅在 AWAITING_PAYMENT 状态显示）
  const renderPriceInfo = () => {
    if (orderState === 'AWAITING_PAYMENT' && totalAmount) {
      return (
        <div className="flex flex-col">
          <span className="text-lg font-bold text-foreground">
            {totalAmount} {currency}
          </span>
          {paymentCoin && <span className="text-xs text-muted-foreground">{paymentCoin}</span>}
        </div>
      );
    }
    return null;
  };

  // 渲染操作按钮
  const renderActionButton = (action: OrderAction, isPrimary: boolean) => {
    const config = getActionButtonConfig(action, userRole, {
      contractType,
      hasPreconfiguredDigitalAssets,
      digitalDeliveryStatus,
      canSyncDigitalDelivery,
      canRetryDigitalDelivery,
      manualDigitalFallbackAllowed,
    });

    // 按钮变体映射
    const variantMap: Record<
      string,
      'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    > = {
      primary: 'default',
      secondary: 'secondary',
      danger: 'destructive',
      outline: 'outline',
    };

    const shouldUsePrimaryStyle =
      isPrimary && action !== 'Dispute' && action !== 'AfterSaleDispute';

    // 主要操作按钮 - 醒目的样式
    if (shouldUsePrimaryStyle) {
      return (
        <Button
          key={action}
          size="sm"
          onClick={() => onAction(action)}
          className="whitespace-nowrap px-4 sm:px-6 h-11 sm:h-10 text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-full"
        >
          {getActionLabel(action)}
        </Button>
      );
    }

    // 危险操作按钮（如 Open Dispute）
    const isDanger = config.variant === 'danger';

    return (
      <Button
        key={action}
        variant={isDanger ? 'outline' : variantMap[config.variant] || 'outline'}
        size="sm"
        onClick={() => onAction(action)}
        className={`whitespace-nowrap px-3 sm:px-4 h-11 sm:h-10 text-xs sm:text-sm font-medium rounded-full ${
          isDanger ? 'border-destructive text-destructive hover:bg-destructive/10' : ''
        }`}
      >
        {getActionLabel(action)}
      </Button>
    );
  };

  // 获取状态显示标签 - 使用 i18n 国际化
  const getStatusLabel = (state: OrderState): string => {
    // 将 SNAKE_CASE 转换为 Title Case（如 AWAITING_PAYMENT → Awaiting Payment）
    const formatStatus = (s: string) =>
      s
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    // 状态对应的 i18n key
    const statusKeys: Record<string, string> = {
      PENDING: 'order.statusLabels.pending',
      AWAITING_PAYMENT: 'order.statusLabels.awaitingPayment',
      AWAITING_PAYMENT_VERIFICATION: 'order.statusLabels.awaitingPaymentVerification',
      AWAITING_PICKUP: 'order.statusLabels.awaitingPickup',
      AWAITING_SHIPMENT: 'order.statusLabels.processing',
      PARTIALLY_SHIPPED: 'order.statusLabels.partialShipped',
      SHIPPED: 'order.statusLabels.shipped',
      COMPLETED: 'order.statusLabels.completed',
      CANCELED: 'order.statusLabels.cancelled',
      DECLINED: 'order.stages.declined',
      REFUNDED: 'order.statusLabels.refunded',
      DISPUTED: 'order.stages.disputed',
      DECIDED: 'order.stages.decided',
      RESOLVED: 'order.stages.resolved',
      PAYMENT_FINALIZED: 'order.statusLabels.finalized',
      PROCESSING_ERROR: 'order.statusLabels.error',
    };

    const key = statusKeys[state];
    if (key) return t(key);
    return formatStatus(state);
  };

  const statusLabel = getStatusLabel(orderState);

  // Transitioning state: show a processing indicator instead of action buttons
  if (isTransitioning) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border shadow-lg z-50 safe-area-inset-bottom ${className}`}
      >
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <HStack justify="center" align="center" className="max-w-screen-xl mx-auto gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {t('order.actions.updatingStatus')}
            </span>
          </HStack>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border shadow-lg z-50 safe-area-inset-bottom ${className}`}
    >
      {/* 内容区域 - 有安全区域内边距 */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <HStack justify="between" align="center" className="max-w-screen-xl mx-auto gap-3">
          {/* 左侧：状态标签 + 价格信息 */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
            {/* 状态标签 - 移动端显示，带背景 */}
            <span className="text-xs sm:text-sm font-medium text-foreground px-2 py-1 bg-muted/50 rounded-md lg:hidden truncate">
              {statusLabel}
            </span>
            {/* 价格/倒计时信息 */}
            {renderPriceInfo() || renderDisputeCountdown()}
          </div>

          {/* 右侧：操作按钮 */}
          <HStack gap="xs" className="flex-shrink-0 gap-2">
            {/* 次要操作按钮 */}
            {secondaryActions.map(action => renderActionButton(action, false))}

            {/* 主要操作按钮 */}
            {primaryAction && renderActionButton(primaryAction, true)}
          </HStack>
        </HStack>
      </div>
    </div>
  );
};

export default OrderFooter;
