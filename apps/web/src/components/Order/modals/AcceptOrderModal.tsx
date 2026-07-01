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

export interface AcceptOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  isLoading?: boolean;
  orderInfo?: {
    orderId: string;
    total: string;
    currency: string;
    buyerName?: string;
  };
}

/**
 * 接受/拒绝订单模态框
 */
export const AcceptOrderModal: React.FC<AcceptOrderModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  isLoading = false,
  orderInfo,
}) => {
  const { t } = useI18n();

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('order.accept.title')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{t('order.accept.description')}</p>

            {orderInfo && (
              <div className="bg-muted rounded-lg p-3 mt-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">{t('order.orderNumber')}:</span>
                  <span className="font-mono">#{orderInfo.orderId}</span>

                  <span className="text-muted-foreground">{t('order.total')}:</span>
                  <span className="font-medium">
                    {orderInfo.total} {orderInfo.currency}
                  </span>

                  {orderInfo.buyerName && (
                    <>
                      <span className="text-muted-foreground">{t('order.buyer')}:</span>
                      <span>{orderInfo.buyerName}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDecline}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('order.accept.decline')}
          </AlertDialogAction>
          <AlertDialogAction onClick={onAccept} disabled={isLoading}>
            {isLoading ? t('common.loading') : t('order.accept.accept')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AcceptOrderModal;
