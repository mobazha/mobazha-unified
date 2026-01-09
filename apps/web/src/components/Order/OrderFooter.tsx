'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/layouts';
import {
  useI18n,
  getOrderActions,
  getPrimaryAction,
  getSecondaryActions,
  getActionButtonConfig,
  getTimeRemaining,
  isOrderExpired,
  type OrderAction,
  type UserRole,
  type OrderState,
} from '@mobazha/core';

// 状态中文标签
const statusLabelsZh: Record<string, string> = {
  PENDING: '待处理',
  AWAITING_PAYMENT: '待付款',
  AWAITING_PICKUP: '待取货',
  AWAITING_FULFILLMENT: '待发货',
  PARTIALLY_FULFILLED: '部分发货',
  FULFILLED: '已发货',
  COMPLETED: '已完成',
  CANCELED: '已取消',
  DECLINED: '已拒绝',
  REFUNDED: '已退款',
  DISPUTED: '争议中',
  DECIDED: '已裁决',
  RESOLVED: '已解决',
  PAYMENT_FINALIZED: '已结算',
  PROCESSING_ERROR: '处理错误',
};

export interface OrderFooterProps {
  orderState: OrderState;
  userRole: UserRole;
  timestamp: string;
  isModerated?: boolean;
  isFulfilled?: boolean;
  paymentMethod?: string;
  totalAmount?: string;
  currency?: string;
  paymentCoin?: string;
  onAction: (action: OrderAction) => void;
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
  isFulfilled = false,
  paymentMethod,
  totalAmount,
  currency,
  paymentCoin,
  onAction,
  className = '',
}) => {
  const { t } = useI18n();

  // 检查是否过期
  const expired = isOrderExpired(timestamp);

  // 获取可用操作
  const actions = getOrderActions(orderState, userRole, {
    isModerated,
    isFulfilled,
    isExpired: expired,
    paymentMethod,
  });

  // 没有可用操作时不显示
  if (actions.length === 0) {
    return null;
  }

  const primaryAction = getPrimaryAction(actions);
  const secondaryActions = getSecondaryActions(actions);

  // 获取操作标签（支持国际化）
  const getActionLabel = (action: OrderAction): string => {
    const labelMap: Record<OrderAction, string> = {
      Pay: t('order.actions.pay'),
      Cancel: t('order.actions.cancel'),
      Dispute: t('order.actions.dispute'),
      Complete: t('order.actions.complete'),
      WriteReview: t('order.actions.writeReview'),
      Accept: t('order.actions.accept'),
      Decline: t('order.actions.decline'),
      Fulfill: t('order.actions.fulfill'),
      Refund: t('order.actions.refund'),
      Claim: t('order.actions.claim'),
      AcceptPayout: t('order.actions.acceptPayout'),
    };
    return labelMap[action] || action;
  };

  // 渲染争议状态倒计时
  const renderDisputeCountdown = () => {
    if (orderState === 'DISPUTED') {
      const remaining = getTimeRemaining(timestamp);
      return (
        <div className="flex items-center gap-1.5 text-amber-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-medium">{remaining}</span>
        </div>
      );
    }
    return null;
  };

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
    const config = getActionButtonConfig(action, userRole);

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

    // 主要操作按钮使用绿色，参照原有移动端设计
    if (isPrimary) {
      return (
        <Button
          key={action}
          size="sm"
          onClick={() => onAction(action)}
          className="whitespace-nowrap px-6 bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {getActionLabel(action)}
        </Button>
      );
    }

    return (
      <Button
        key={action}
        variant={variantMap[config.variant] || 'outline'}
        size="sm"
        onClick={() => onAction(action)}
        className="whitespace-nowrap px-4"
      >
        {getActionLabel(action)}
      </Button>
    );
  };

  // 获取状态显示标签
  const statusLabel = statusLabelsZh[orderState] || orderState;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 shadow-lg z-50 ${className}`}
    >
      <HStack justify="between" align="center" className="max-w-screen-xl mx-auto">
        {/* 左侧：状态标签 + 价格信息 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* 状态标签 - 移动端显示 */}
          <span className="text-sm font-medium text-foreground lg:hidden">{statusLabel}</span>
          {/* 价格/倒计时信息 */}
          {renderPriceInfo() || renderDisputeCountdown()}
        </div>

        {/* 右侧：操作按钮 */}
        <HStack gap="sm" className="flex-shrink-0">
          {/* 次要操作按钮 */}
          {secondaryActions.map(action => renderActionButton(action, false))}

          {/* 主要操作按钮 */}
          {primaryAction && renderActionButton(primaryAction, true)}
        </HStack>
      </HStack>
    </div>
  );
};

export default OrderFooter;
