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

export type OrderConfirmType =
  | 'accept'
  | 'decline'
  | 'cancel'
  | 'refund'
  | 'claim'
  | 'acceptPayout'
  | 'complete';

export interface OrderConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: OrderConfirmType;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * 通用订单确认对话框组件
 * 用于接受、拒绝、取消、退款、领取资金、接受裁决等操作的确认
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
    accept: {
      titleKey: 'order.dialogs.acceptOrder.title',
      descriptionKey: 'order.dialogs.acceptOrder.description',
      confirmKey: 'order.actions.accept',
    },
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
    acceptPayout: {
      titleKey: 'order.dialogs.acceptPayout.title',
      descriptionKey: 'order.dialogs.acceptPayout.description',
      confirmKey: 'order.actions.acceptPayout',
    },
    complete: {
      titleKey: 'order.dialogs.completeOrder.title',
      descriptionKey: 'order.dialogs.completeOrder.description',
      confirmKey: 'order.actions.complete',
    },
  };

  const config = dialogConfig[type];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(config.titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>{t(config.descriptionKey)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={
              config.isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {isLoading ? t('common.processing') : t(config.confirmKey)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default OrderConfirmDialog;
