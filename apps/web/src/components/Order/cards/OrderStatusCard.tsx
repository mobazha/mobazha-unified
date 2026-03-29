'use client';

import React, { memo, useMemo } from 'react';
import { useI18n, type DisplayOrder } from '@mobazha/core';
import { cn } from '@/lib/utils';
import {
  Clock,
  CircleDollarSign,
  PackageCheck,
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

export interface OrderStatusCardProps {
  displayOrder: DisplayOrder;
  fiatPendingConfirmation?: boolean;
  className?: string;
}

interface StatusConfig {
  icon: React.ElementType;
  message: string;
  hint?: string;
  color: string;
  bgColor: string;
  progress: number;
}

export const OrderStatusCard = memo(function OrderStatusCard({
  displayOrder: order,
  fiatPendingConfirmation = false,
  className,
}: OrderStatusCardProps) {
  const { t } = useI18n();

  const isCryptoPayment = !order.fiatPayment;

  const config = useMemo((): StatusConfig => {
    const isBuyer = order.userRole === 'buyer';

    switch (order.status) {
      case 'awaiting_payment':
        if (isBuyer && fiatPendingConfirmation) {
          return {
            icon: Clock,
            message: t('order.statusCard.awaitingPaymentBuyerFiatPending'),
            hint: t('order.statusCard.awaitingPaymentHintFiatPending'),
            color: 'text-warning',
            bgColor: 'bg-warning/8 border-warning/20',
            progress: 0,
          };
        }
        return {
          icon: CircleDollarSign,
          message: isBuyer
            ? t('order.statusCard.awaitingPaymentBuyer')
            : t('order.statusCard.awaitingPaymentSeller'),
          hint: isBuyer ? t('order.statusCard.awaitingPaymentHint') : undefined,
          color: 'text-destructive',
          bgColor: 'bg-destructive/8 border-destructive/20',
          progress: 0,
        };
      case 'pending':
      case 'paid':
        return {
          icon: Clock,
          message: isBuyer
            ? t('order.statusCard.pendingBuyer')
            : t('order.statusCard.pendingSeller'),
          hint:
            isBuyer && isCryptoPayment
              ? t('order.statusCard.pendingBuyerConfirmingHint')
              : undefined,
          color: 'text-warning',
          bgColor: 'bg-warning/8 border-warning/20',
          progress: 1,
        };
      case 'processing':
        return {
          icon: PackageCheck,
          message: isBuyer
            ? t('order.statusCard.processingBuyer')
            : t('order.statusCard.processingSeller'),
          color: 'text-info',
          bgColor: 'bg-info/8 border-info/20',
          progress: 2,
        };
      case 'shipped':
        return {
          icon: Truck,
          message: isBuyer
            ? t('order.statusCard.shippedBuyer')
            : t('order.statusCard.shippedSeller'),
          hint: isBuyer ? t('order.statusCard.shippedHint') : undefined,
          color: 'text-primary',
          bgColor: 'bg-primary/8 border-primary/20',
          progress: 3,
        };
      case 'delivered':
        return {
          icon: CheckCircle2,
          message: isBuyer
            ? t('order.statusCard.deliveredBuyer')
            : t('order.statusCard.deliveredSeller'),
          color: 'text-primary',
          bgColor: 'bg-primary/8 border-primary/20',
          progress: 3,
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          message: t('order.statusCard.completed'),
          color: 'text-success',
          bgColor: 'bg-success/8 border-success/20',
          progress: 4,
        };
      case 'disputed':
        return {
          icon: ShieldAlert,
          message: t('order.statusCard.disputed'),
          hint: t('order.statusCard.disputedHint'),
          color: 'text-destructive',
          bgColor: 'bg-destructive/8 border-destructive/20',
          progress: -1,
        };
      case 'cancelled':
        return {
          icon: XCircle,
          message: t('order.statusCard.cancelled'),
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50 border-border/50',
          progress: -1,
        };
      case 'refunded':
        return {
          icon: RotateCcw,
          message: t('order.statusCard.refunded'),
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50 border-border/50',
          progress: -1,
        };
      default:
        return {
          icon: AlertTriangle,
          message: order.status,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50 border-border/50',
          progress: 0,
        };
    }
  }, [order.status, order.userRole, isCryptoPayment, fiatPendingConfirmation, t]);

  const stepLabels = useMemo(
    () => [
      t('order.statusCard.stepPaid'),
      t('order.statusCard.stepAccepted'),
      t('order.statusCard.stepShipped'),
      t('order.statusCard.stepComplete'),
    ],
    [t]
  );

  const Icon = config.icon;
  const isTerminal = config.progress < 0;
  const cancelReason = order.cancelReason;

  return (
    <div
      className={cn('rounded-xl border p-3', config.bgColor, className)}
      data-testid="order-status-card"
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 shrink-0', config.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', config.color)}>{config.message}</p>
          {config.hint && <p className="text-xs text-muted-foreground mt-0.5">{config.hint}</p>}
          {isTerminal && cancelReason && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('order.statusCard.reason')}: {cancelReason}
            </p>
          )}
        </div>
      </div>

      {!isTerminal && (
        <div className="mt-3 px-0.5">
          <div className="flex items-center gap-1">
            {stepLabels.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < config.progress
                    ? 'bg-primary'
                    : i === config.progress
                      ? 'bg-primary/40'
                      : 'bg-muted-foreground/15'
                )}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {stepLabels.map((label, i) => (
              <span
                key={i}
                className={cn(
                  'text-[10px] leading-tight',
                  i < config.progress
                    ? 'text-primary font-medium'
                    : i === config.progress
                      ? 'text-primary/60'
                      : 'text-muted-foreground/50'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
