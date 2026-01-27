'use client';

import React, { useState, useCallback } from 'react';
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

export interface FulfillOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
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

  const handleSubmit = useCallback(async () => {
    if (!trackingInfo.trackingNumber.trim()) {
      toast({
        title: t('order.actions.error'),
        description: t('order.fulfill.trackingRequired'),
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
  }, [orderId, trackingInfo, onOpenChange, onSuccess, t, toast]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // 关闭时重置表单
        setTrackingInfo({ shipper: '', trackingNumber: '', note: '' });
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
