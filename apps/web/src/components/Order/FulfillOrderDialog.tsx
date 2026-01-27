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
import { useI18n, ordersApi, CONTRACT_TYPES, type ContractType } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import type { ReceivingAccount } from '@mobazha/core/services/api/wallet';
import { ReceivingAccountSelector } from './ReceivingAccountSelector';

export interface FulfillOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  /** 合约类型，用于判断是否显示收款账户选择器 */
  contractType?: string;
  /** 区块链类型，用于筛选收款账户 */
  blockchain?: string;
  onSuccess?: () => void;
}

/**
 * 判断是否需要显示收款账户选择器
 * 参考桌面端逻辑：只有 RWA_TOKEN 类型订单需要选择收款账户
 */
const shouldShowReceivingAccountSelector = (contractType?: string): boolean => {
  return contractType === CONTRACT_TYPES.RWA_TOKEN;
};

/**
 * 发货对话框组件
 * 用于卖家填写物流信息并确认发货
 */
export const FulfillOrderDialog: React.FC<FulfillOrderDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  contractType,
  blockchain,
  onSuccess,
}) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState({
    shipper: '',
    trackingNumber: '',
    note: '',
  });

  // 收款账户相关
  const selectedAccountRef = useRef<ReceivingAccount | null>(null);
  const showReceivingAccountSelector = shouldShowReceivingAccountSelector(contractType);

  // 处理收款账户选择变化
  const handleAccountChange = useCallback((account: ReceivingAccount | null) => {
    selectedAccountRef.current = account;
  }, []);

  const handleSubmit = useCallback(async () => {
    // 普通物流订单需要验证快递单号
    if (contractType !== CONTRACT_TYPES.RWA_TOKEN && !trackingInfo.trackingNumber.trim()) {
      toast({
        title: t('order.actions.error'),
        description: t('order.fulfill.trackingRequired'),
        variant: 'destructive',
      });
      return;
    }

    // RWA_TOKEN 订单需要验证收款账户
    if (showReceivingAccountSelector && !selectedAccountRef.current) {
      toast({
        title: t('order.actions.error'),
        description: t('order.fulfill.receivingAccountRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload: Parameters<typeof ordersApi.fulfillOrder>[0] = {
        orderID: orderId,
        note: trackingInfo.note || '',
      };

      // 根据合约类型设置不同的发货信息
      if (contractType !== CONTRACT_TYPES.RWA_TOKEN) {
        payload.physicalDelivery = {
          shipper: trackingInfo.shipper || '',
          trackingNumber: trackingInfo.trackingNumber,
        };
      }

      // 如果需要收款账户，添加到请求中
      if (showReceivingAccountSelector && selectedAccountRef.current) {
        payload.receivingAccountID = selectedAccountRef.current.id;
      }

      const result = await ordersApi.fulfillOrder(payload);

      if (result.success) {
        toast({
          title: t('order.actions.fulfillSuccess'),
          description: t('order.actions.fulfillSuccessDesc'),
        });
        setTrackingInfo({ shipper: '', trackingNumber: '', note: '' });
        selectedAccountRef.current = null;
        onOpenChange(false);
        // 延迟刷新以确保后端状态已更新
        setTimeout(() => {
          onSuccess?.();
        }, 500);
      } else {
        throw new Error(result.error || 'Failed to fulfill order');
      }
    } catch (error) {
      toast({
        title: t('order.actions.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    orderId,
    contractType,
    trackingInfo,
    showReceivingAccountSelector,
    onOpenChange,
    onSuccess,
    t,
    toast,
  ]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // 关闭时重置表单
        setTrackingInfo({ shipper: '', trackingNumber: '', note: '' });
        selectedAccountRef.current = null;
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('order.fulfill.shipOrder')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('order.dialogs.fulfillOrder.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* 收款账户选择器 - 只在 RWA_TOKEN 类型订单显示 */}
          {showReceivingAccountSelector && (
            <ReceivingAccountSelector
              blockchain={blockchain}
              onAccountChange={handleAccountChange}
              disabled={isLoading}
              required
            />
          )}

          {/* 普通订单的物流信息表单 */}
          {contractType !== CONTRACT_TYPES.RWA_TOKEN && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t('order.fulfill.carrier')}
                </label>
                <input
                  type="text"
                  value={trackingInfo.shipper}
                  onChange={e => setTrackingInfo(prev => ({ ...prev, shipper: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder={t('order.fulfill.carrierPlaceholder')}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t('order.fulfill.trackingNumber')} *
                </label>
                <input
                  type="text"
                  value={trackingInfo.trackingNumber}
                  onChange={e =>
                    setTrackingInfo(prev => ({ ...prev, trackingNumber: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder={t('order.fulfill.trackingPlaceholder')}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t('order.fulfill.note')}
            </label>
            <textarea
              value={trackingInfo.note}
              onChange={e => setTrackingInfo(prev => ({ ...prev, note: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              placeholder={t('order.fulfill.notePlaceholder')}
              disabled={isLoading}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t('common.processing') : t('order.fulfill.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FulfillOrderDialog;
