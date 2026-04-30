'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, fulfillmentApi } from '@mobazha/core';
import type { FulfillmentOrder, FulfillmentStatus } from '@mobazha/core';

interface FulfillmentStatusCardProps {
  orderId: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  FulfillmentStatus,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  draft: { icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  pending: {
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  in_process: {
    icon: Package,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  shipped: {
    icon: Truck,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  delivered: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  canceled: { icon: XCircle, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  failed: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  supplier_loss: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

export function FulfillmentStatusCard({ orderId, className }: FulfillmentStatusCardProps) {
  const { t } = useI18n();
  const [fulfillment, setFulfillment] = useState<FulfillmentOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fo = await fulfillmentApi.getFulfillmentOrderStatus(orderId);
      if (!cancelled) {
        setFulfillment(fo);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('order.fulfillment.loading')}</span>
        </div>
      </div>
    );
  }

  if (!fulfillment) return null;

  const cfg = STATUS_CONFIG[fulfillment.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const statusLabel = t(`order.fulfillment.status.${fulfillment.status}`) || fulfillment.status;

  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t('order.fulfillment.title')}</h3>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', cfg.bgColor)}>
          <Icon className={cn('w-4 h-4', cfg.color)} />
        </div>
        <div>
          <span className={cn('text-sm font-medium', cfg.color)}>{statusLabel}</span>
          {fulfillment.updatedAt && (
            <p className="text-xs text-muted-foreground">
              {new Date(fulfillment.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>

      {fulfillment.errorMessage && (
        <div className="flex items-start gap-2 mb-3 p-2 rounded bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{fulfillment.errorMessage}</span>
        </div>
      )}

      {fulfillment.shipments && fulfillment.shipments.length > 0 && (
        <div className="space-y-2">
          {fulfillment.shipments.map(s => (
            <div
              key={s.id || s.trackingNumber}
              className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-2"
            >
              <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{s.carrier}</span>
              <span className="font-mono text-xs">{s.trackingNumber}</span>
              {s.trackingUrl && (
                <a
                  href={s.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-primary hover:text-primary/80"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {fulfillment.costs && (
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-3">
          <span>
            {t('order.fulfillment.supplierCost')}:{' '}
            <span className="font-medium text-foreground">
              {fulfillment.costs.currency ? `${fulfillment.costs.currency} ` : ''}
              {fulfillment.costs.total}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
