'use client';

import React, { useCallback, useMemo, useRef } from 'react';
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
import {
  useI18n,
  ordersApi,
  useOrderAction,
  supportsBackendSettlementActionSurface,
} from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import type { ReceivingAccount } from '@mobazha/core/services/api/wallet';
import { ReceivingAccountSelector } from './ReceivingAccountSelector';

export interface AcceptOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  /** 区块链类型，用于筛选收款账户 */
  blockchain?: string;
  /** 支付币种，用于判断是否需要钱包签名。法币格式: "fiat:paypal:USD" */
  paymentCoin?: string;
  onSuccess?: () => void;
}

/**
 * 接受订单对话框组件
 *
 * 法币订单（PayPal/Stripe）：资金已直达卖家账户，仅需确认接单，无需选收款地址。
 * 加密货币订单：需选择收款账户，可能涉及 Escrow 释放的链上交易。
 */
export const AcceptOrderDialog: React.FC<AcceptOrderDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  blockchain,
  paymentCoin,
  onSuccess,
}) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { execute, isLoading } = useOrderAction();

  const isFiatPayment = useMemo(
    () => !!paymentCoin && paymentCoin.toLowerCase().startsWith('fiat:'),
    [paymentCoin]
  );

  const selectedAccountRef = useRef<ReceivingAccount | null>(null);

  const handleAccountChange = useCallback((account: ReceivingAccount | null) => {
    selectedAccountRef.current = account;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isFiatPayment && !selectedAccountRef.current) {
      toast({
        title: t('order.actions.error'),
        description: t('order.accept.receivingAccountRequired'),
        variant: 'destructive',
      });
      return;
    }

    const payoutAddress = isFiatPayment ? '' : (selectedAccountRef.current?.address ?? '');

    try {
      await execute({
        executeBackendSettlementAction: () =>
          ordersApi.executeSettlementAction({
            orderID: orderId,
            action: 'confirm',
            payoutAddress,
          }),
        attemptBackendSettlementAction:
          !isFiatPayment && supportsBackendSettlementActionSurface(paymentCoin),
        executeAction: txID =>
          ordersApi.confirmOrder({
            orderID: orderId,
            decline: false,
            payoutAddress,
            transactionID: txID,
          }),
        onSuccess: () => {
          toast({
            title: t('order.actions.acceptSuccess'),
            description: t('order.actions.acceptSuccessDesc'),
          });
          selectedAccountRef.current = null;
          onOpenChange(false);
          onSuccess?.();
        },
        onError: error => {
          toast({
            title: t('order.actions.error'),
            description: error.message || t('order.actions.acceptFailed'),
            variant: 'destructive',
          });
        },
      });
    } catch {
      // Error is already handled in onError callback
    }
  }, [orderId, paymentCoin, isFiatPayment, onOpenChange, onSuccess, t, toast, execute]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        selectedAccountRef.current = null;
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('order.accept.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {isFiatPayment ? t('order.accept.fiatDescription') : t('order.accept.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!isFiatPayment && (
          <div className="space-y-4 py-4">
            <ReceivingAccountSelector
              blockchain={blockchain}
              paymentCoin={paymentCoin}
              onAccountChange={handleAccountChange}
              disabled={isLoading}
              required
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t('common.processing') : t('order.actions.accept')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AcceptOrderDialog;
