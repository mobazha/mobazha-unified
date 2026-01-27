'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import { useI18n, ordersApi, walletApi } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import type { ReceivingAccount } from '@mobazha/core/services/api/wallet';

export interface FulfillOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  paymentCoin?: string; // 订单支付币种，用于筛选收款账户
  onSuccess?: () => void;
}

/**
 * 发货对话框组件
 * 用于卖家填写物流信息并确认发货
 */
export const FulfillOrderDialog: React.FC<FulfillOrderDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  paymentCoin,
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

  // 收款账户相关状态
  const [receivingAccounts, setReceivingAccounts] = useState<ReceivingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // 加载收款账户列表
  useEffect(() => {
    if (open) {
      loadReceivingAccounts();
    }
  }, [open]);

  const loadReceivingAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const accounts = await walletApi.getReceivingAccounts();
      // 只显示激活的账户
      const activeAccounts = accounts.filter(acc => acc.isActive);
      setReceivingAccounts(activeAccounts);
      // 如果有账户，默认选择第一个
      if (activeAccounts.length > 0) {
        setSelectedAccountId(activeAccounts[0].id);
      }
    } catch (error) {
      console.error('Failed to load receiving accounts:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  // 格式化地址显示
  const formatAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const handleSubmit = useCallback(async () => {
    if (!trackingInfo.trackingNumber.trim()) {
      toast({
        title: t('order.actions.error'),
        description: t('order.fulfill.trackingRequired'),
        variant: 'destructive',
      });
      return;
    }

    // 检查是否选择了收款账户
    if (receivingAccounts.length > 0 && !selectedAccountId) {
      toast({
        title: t('order.actions.error'),
        description: t('order.fulfill.receivingAccountRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await ordersApi.fulfillOrder({
        orderID: orderId,
        physicalDelivery: {
          shipper: trackingInfo.shipper || '',
          trackingNumber: trackingInfo.trackingNumber,
        },
        note: trackingInfo.note || '',
        receivingAccountID: selectedAccountId,
      });

      if (result.success) {
        toast({
          title: t('order.actions.fulfillSuccess'),
          description: t('order.actions.fulfillSuccessDesc'),
        });
        setTrackingInfo({ shipper: '', trackingNumber: '', note: '' });
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
    trackingInfo,
    selectedAccountId,
    receivingAccounts.length,
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
        setSelectedAccountId(undefined);
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
          {/* 收款账户选择器 */}
          {receivingAccounts.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {t('order.fulfill.receivingAccount')} *
              </label>
              <select
                value={selectedAccountId || ''}
                onChange={e =>
                  setSelectedAccountId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                disabled={isLoading || isLoadingAccounts}
              >
                <option value="">{t('order.fulfill.selectReceivingAccount')}</option>
                {receivingAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.chainType}) - {formatAddress(account.address)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('order.fulfill.receivingAccountHint')}
              </p>
            </div>
          )}

          {/* 如果没有收款账户，显示提示 */}
          {!isLoadingAccounts && receivingAccounts.length === 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t('order.fulfill.noReceivingAccount')}
              </p>
            </div>
          )}

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
              onChange={e => setTrackingInfo(prev => ({ ...prev, trackingNumber: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder={t('order.fulfill.trackingPlaceholder')}
              disabled={isLoading}
            />
          </div>

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
