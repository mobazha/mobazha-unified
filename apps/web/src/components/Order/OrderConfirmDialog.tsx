'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { useI18n } from '@mobazha/core';

export type OrderConfirmType = 'decline' | 'cancel' | 'refund' | 'claim' | 'complete';

export interface OrderConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: OrderConfirmType;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * 通用订单确认对话框组件
 * 用于接受、拒绝、取消、退款、领取资金等操作的确认
 */
export const OrderConfirmDialog: React.FC<OrderConfirmDialogProps> = ({
  open,
  onOpenChange,
  type,
  onConfirm,
  isLoading = false,
}) => {
  const { t } = useI18n();

  // 对话框配置映射
  const dialogConfig: Record<
    OrderConfirmType,
    {
      titleKey: string;
      descriptionKey: string;
      confirmKey: string;
      isDestructive?: boolean;
    }
  > = {
    decline: {
      titleKey: 'order.dialogs.declineOrder.title',
      descriptionKey: 'order.dialogs.declineOrder.description',
      confirmKey: 'order.actions.decline',
      isDestructive: true,
    },
    cancel: {
      titleKey: 'order.dialogs.cancelOrder.title',
      descriptionKey: 'order.dialogs.cancelOrder.description',
      confirmKey: 'order.actions.cancel',
      isDestructive: true,
    },
    refund: {
      titleKey: 'order.dialogs.refundOrder.title',
      descriptionKey: 'order.dialogs.refundOrder.description',
      confirmKey: 'order.actions.refund',
    },
    claim: {
      titleKey: 'order.dialogs.claimPayment.title',
      descriptionKey: 'order.dialogs.claimPayment.description',
      confirmKey: 'order.actions.claim',
    },
    complete: {
      titleKey: 'order.dialogs.completeOrder.title',
      descriptionKey: 'order.dialogs.completeOrder.description',
      confirmKey: 'order.actions.complete',
    },
  };

  const config = dialogConfig[type];

  const confirmLabel = isLoading ? t('common.processing') : t(config.confirmKey);

  return (
    <AlertDialog
      open={open}
      onOpenChange={nextOpen => {
        if (isLoading && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(config.titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>{t(config.descriptionKey)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={event => {
              event.preventDefault();
              if (!isLoading) onConfirm();
            }}
            disabled={isLoading}
            className={
              config.isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default OrderConfirmDialog;
