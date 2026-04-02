'use client';

import React, { useCallback, useRef } from 'react';
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
import { useI18n, ordersApi, useOrderAction } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import type { ReceivingAccount } from '@mobazha/core/services/api/wallet';
import { ReceivingAccountSelector } from './ReceivingAccountSelector';

export interface AcceptOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  /** 区块链类型，用于筛选收款账户 */
  blockchain?: string;
  /** 支付币种，用于判断是否需要钱包签名 */
  paymentCoin?: string;
  onSuccess?: () => void;
}

/**
 * 接受订单对话框组件
 * 卖家接受订单时需要选择收款账户
 *
 * 使用统一的 useOrderAction hook 处理订单操作：
 * - UTXO 链（BTC/LTC/BCH/ZEC）：直接调用 API
 * - EVM/Solana 链：先获取 instructions，如需要则执行链上交易
 *
 * 参考移动端 AcceptOrderModal.js 和桌面端 Payments.vue
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

  // 收款账户相关
  const selectedAccountRef = useRef<ReceivingAccount | null>(null);

  // 处理收款账户选择变化
  const handleAccountChange = useCallback((account: ReceivingAccount | null) => {
    selectedAccountRef.current = account;
  }, []);

  const handleSubmit = useCallback(async () => {
    // 需要验证已选择收款账户
    if (!selectedAccountRef.current) {
      toast({
        title: t('order.actions.error'),
        description: t('order.accept.receivingAccountRequired'),
        variant: 'destructive',
      });
      return;
    }

    const payoutAddress = selectedAccountRef.current.address;

    try {
      await execute({
        paymentCoin,
        // 获取确认订单的链上交易指令（EVM/Solana 链需要）
        getInstructions: initiatorAddress =>
          ordersApi.getConfirmInstructions({
            orderID: orderId,
            decline: false,
            initiatorAddress,
            payoutAddress,
          }),
        // 执行确认订单的 API 调用
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
          // 延迟刷新以确保后端状态已更新
          setTimeout(() => {
            onSuccess?.();
          }, 500);
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
  }, [orderId, paymentCoin, onOpenChange, onSuccess, t, toast, execute]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // 关闭时重置
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
          <AlertDialogDescription>{t('order.accept.description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* 收款账户选择器 */}
          <ReceivingAccountSelector
            blockchain={blockchain}
            paymentCoin={paymentCoin}
            onAccountChange={handleAccountChange}
            disabled={isLoading}
            required
          />
        </div>

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
