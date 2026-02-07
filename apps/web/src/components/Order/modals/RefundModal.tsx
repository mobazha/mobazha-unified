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

export interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  orderInfo?: {
    orderId: string;
    total: string;
    currency: string;
    buyerName?: string;
  };
}

/**
 * 退款确认模态框
 */
export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  orderInfo,
}) => {
  const { t } = useI18n();

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('order.refund.title')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{t('order.refund.description')}</p>

            {orderInfo && (
              <div className="bg-muted rounded-lg p-3 mt-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">{t('order.orderNumber')}:</span>
                  <span className="font-mono">#{orderInfo.orderId}</span>

                  <span className="text-muted-foreground">{t('order.refund.amount')}:</span>
                  <span className="font-medium text-destructive">
                    {orderInfo.total} {orderInfo.currency}
                  </span>

                  {orderInfo.buyerName && (
                    <>
                      <span className="text-muted-foreground">{t('order.refund.refundTo')}:</span>
                      <span>{orderInfo.buyerName}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="bg-warning/8 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-xs text-warning">{t('order.refund.warning')}</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? t('common.loading') : t('order.refund.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RefundModal;
