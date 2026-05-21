'use client';

import React, { memo, useMemo } from 'react';
import { useI18n, type DisplayOrder } from '@mobazha/core';
import type { Order as CoreOrder } from '@mobazha/core';
import { OrderCompleteCard, ShipmentCard, AcceptedCard } from '@/components/Order';
import { getBlockExplorerUrl } from '@/components/Order/utils';
import { cn } from '@/lib/utils';
import { ShoppingBag, XCircle, Clock } from 'lucide-react';

export interface OrderTimelineCardProps {
  displayOrder: DisplayOrder;
  coreOrder?: CoreOrder | null;
  className?: string;
}

function CancelledTimeline({ order }: { order: DisplayOrder }) {
  const { t } = useI18n();
  const createdEvent = order.timeline.find(e => e.status === 'created');
  const cancelledEvent = order.timeline.find(e => e.status === 'cancelled');

  const steps = [
    {
      icon: ShoppingBag,
      label: t('order.timeline.orderPlaced'),
      timestamp: createdEvent?.timestamp,
      done: true,
    },
    {
      icon: Clock,
      label: t('order.statusCard.stepPaid'),
      timestamp: undefined,
      done: false,
      skipped: true,
    },
    {
      icon: XCircle,
      label: t('order.timeline.orderCancelled'),
      timestamp: cancelledEvent?.timestamp,
      done: true,
      isCancelled: true,
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                  step.isCancelled
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                    : step.done
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground/50'
                )}
              >
                <step.icon className="w-3.5 h-3.5" />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-px h-6',
                    step.done && !step.skipped ? 'bg-primary/30' : 'bg-border'
                  )}
                />
              )}
            </div>
            <div className={cn('pb-3', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm leading-6',
                  step.isCancelled
                    ? 'font-medium text-amber-600 dark:text-amber-400'
                    : step.skipped
                      ? 'text-muted-foreground/50 line-through'
                      : 'text-foreground'
                )}
              >
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-xs text-muted-foreground">
                  {new Date(step.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const OrderTimelineCard = memo(function OrderTimelineCard({
  displayOrder: order,
  className,
}: OrderTimelineCardProps) {
  const { t } = useI18n();

  const hasHistory = useMemo(() => {
    return (
      order.status === 'completed' ||
      order.status === 'cancelled' ||
      !!order.trackingNumber ||
      ['processing', 'shipped', 'delivered', 'completed'].includes(order.status)
    );
  }, [order.status, order.trackingNumber]);

  if (!hasHistory) return null;

  if (order.status === 'cancelled') {
    return (
      <div className={className}>
        <CancelledTimeline order={order} />
      </div>
    );
  }

  const completionReleasesFunds = !order.fundsReleasedAtConfirmation;
  const releaseTxHash = completionReleasesFunds ? order.releaseTx || order.paymentTx : undefined;
  const completeTxUrl = releaseTxHash
    ? getBlockExplorerUrl(releaseTxHash, order.currency || '', order.chainId) || undefined
    : undefined;

  return (
    <div className={className}>
      <div className="space-y-2">
        {order.status === 'completed' && (
          <div className="bg-muted/10 rounded-lg p-2">
            <OrderCompleteCard
              timestamp={order.timeline.find(e => e.status === 'completed')?.timestamp}
              amount={order.total}
              currency={order.currency}
              txHash={releaseTxHash}
              txUrl={completeTxUrl}
              description={
                completionReleasesFunds ? t('order.fundsReleased') : t('order.actions.complete')
              }
              showDivider={false}
            />
          </div>
        )}

        {(order.trackingNumber || ['shipped', 'delivered', 'completed'].includes(order.status)) && (
          <div className="bg-muted/10 rounded-lg p-2">
            <ShipmentCard
              timestamp={order.timeline.find(e => e.status === 'shipped')?.timestamp}
              shipper={order.shipper}
              trackingNumber={order.trackingNumber}
              contractType={order.contractType}
              showDivider={false}
            />
          </div>
        )}

        {['processing', 'shipped', 'delivered', 'completed'].includes(order.status) && (
          <div className="bg-muted/10 rounded-lg p-2">
            <AcceptedCard
              timestamp={order.timeline.find(e => e.status === 'processing')?.timestamp}
              description={
                order.userRole === 'seller'
                  ? t('order.acceptedDescSeller')
                  : t('order.acceptedDescBuyer')
              }
              showDivider={false}
            />
          </div>
        )}
      </div>
    </div>
  );
});
