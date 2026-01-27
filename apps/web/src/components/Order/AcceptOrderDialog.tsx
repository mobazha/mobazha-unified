'use client';

import React, { useState, useCallback, useRef } from 'react';
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
import { useI18n, ordersApi } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import type { ReceivingAccount } from '@mobazha/core/services/api/wallet';
import { ReceivingAccountSelector } from './ReceivingAccountSelector';

export interface AcceptOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  /** 区块链类型，用于筛选收款账户 */
  blockchain?: string;
  onSuccess?: () => void;
}

/**
 * 接受订单对话框组件
 * 卖家接受订单时需要选择收款账户
 * 参考移动端 AcceptOrderModal.js 和桌面端 Payments.vue
 */
export const AcceptOrderDialog: React.FC<AcceptOrderDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  blockchain,
  onSuccess,
}) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
    try {
      const result = await ordersApi.confirmOrder({
        orderID: orderId,
        reject: false,
        payoutAddress: selectedAccountRef.current.address,
      });

      if (result.success) {
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
      } else {
        toast({
          title: t('order.actions.error'),
          description: result.error || t('order.actions.acceptFailed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('order.actions.error'),
        description: error instanceof Error ? error.message : t('order.actions.acceptFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [orderId, onOpenChange, onSuccess, t, toast]);

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
