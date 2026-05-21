'use client';

import React, { memo } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SellerDigitalDeliveryStatusProps {
  isDigitalOrder: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  assetCount: number;
  hasPreconfiguredAssets: boolean;
  status:
    | 'not_digital'
    | 'ready'
    | 'delivered'
    | 'manual_required'
    | 'pending'
    | 'restricted'
    | null;
  error: string | null;
  canSyncDelivery?: boolean;
  onSyncDelivery: () => Promise<boolean>;
  className?: string;
}

export const SellerDigitalDeliveryStatus = memo(function SellerDigitalDeliveryStatus({
  isDigitalOrder,
  isLoading,
  isSyncing,
  assetCount,
  hasPreconfiguredAssets,
  status,
  error,
  canSyncDelivery = true,
  onSyncDelivery,
  className,
}: SellerDigitalDeliveryStatusProps) {
  const { t } = useI18n();

  if (!isDigitalOrder) {
    return null;
  }

  const isDelivered = status === 'delivered';
  const isReady = status === 'ready';
  const isAttention = Boolean(error) || status === 'manual_required' || status === 'restricted';
  const Icon = isLoading ? Loader2 : isAttention ? AlertCircle : CheckCircle2;
  const showSyncAction = isDelivered && canSyncDelivery;
  const title = isDelivered
    ? t('order.digitalDelivery.deliveredTitle')
    : hasPreconfiguredAssets
      ? isReady
        ? t('order.digitalDelivery.readyTitle')
        : t('order.digitalDelivery.pendingTitle')
      : t('order.digitalDelivery.manualTitle');
  const description = isLoading
    ? t('order.digitalDelivery.checking')
    : isDelivered
      ? t('order.digitalDelivery.deliveredDesc', { count: assetCount })
      : hasPreconfiguredAssets
        ? isReady
          ? t('order.digitalDelivery.readyDesc', { count: assetCount })
          : t('order.digitalDelivery.pendingDesc')
        : t('order.digitalDelivery.manualDesc');

  return (
    <Card
      className={cn(
        'p-4 border',
        isAttention ? 'border-warning/30 bg-warning/5' : 'border-success/30 bg-success/5',
        className
      )}
      data-testid="seller-digital-delivery-status"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-md flex items-center justify-center shrink-0',
            isAttention ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
          )}
        >
          <Icon className={cn('w-5 h-5', isLoading && 'animate-spin')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
            {showSyncAction && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void onSyncDelivery();
                }}
                disabled={isLoading || isSyncing}
                className="h-10 shrink-0"
              >
                <RefreshCw className={cn('w-4 h-4 mr-1.5', isSyncing && 'animate-spin')} />
                {isSyncing ? t('common.processing') : t('order.digitalDelivery.syncAction')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
});

export default SellerDigitalDeliveryStatus;
