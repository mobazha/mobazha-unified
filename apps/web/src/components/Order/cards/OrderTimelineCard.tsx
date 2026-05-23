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

type TimelineCardEntry = {
  key: string;
  timestamp?: string;
  priority: number;
  node: React.ReactNode;
};

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
  const paymentEvent = order.timeline.find(e => e.status === 'paid');
  const acceptedEvent = order.timeline.find(e => e.status === 'processing');
  const shippedEvent = order.timeline.find(e => e.status === 'shipped');
  const releasedEvent = order.timeline.find(e => e.status === 'released');
  const completedEvent = order.timeline.find(e => e.status === 'completed');

  const hasHistory = useMemo(() => {
    return (
      order.status === 'completed' ||
      order.status === 'cancelled' ||
      !!order.paymentTx ||
      !!order.releaseTx ||
      !!order.trackingNumber ||
      ['processing', 'shipped', 'delivered', 'completed'].includes(order.status)
    );
  }, [order.status, order.trackingNumber, order.paymentTx, order.releaseTx]);

  if (!hasHistory) return null;

  if (order.status === 'cancelled') {
    return (
      <div className={className}>
        <CancelledTimeline order={order} />
      </div>
    );
  }

  const releaseTxHash =
    order.releaseTx && order.releaseTx !== order.paymentTx ? order.releaseTx : undefined;
  const releaseTxUrl = releaseTxHash
    ? getBlockExplorerUrl(releaseTxHash, order.currency || '', order.chainId) || undefined
    : undefined;
  const completedTxHash =
    !order.fundsReleasedAtConfirmation && !releaseTxHash
      ? order.releaseTx || order.paymentTx
      : undefined;
  const completedTxUrl = completedTxHash
    ? getBlockExplorerUrl(completedTxHash, order.currency || '', order.chainId) || undefined
    : undefined;

  const timelineCards: TimelineCardEntry[] = [];

  if (order.paymentTx && paymentEvent) {
    timelineCards.push({
      key: 'paid',
      timestamp: paymentEvent.timestamp,
      priority: 10,
      node: (
        <OrderCompleteCard
          title={t('order.stages.escrowed')}
          timestamp={paymentEvent.timestamp}
          amount={order.total}
          currency={order.currency}
          txHash={order.paymentTx}
          txUrl={
            getBlockExplorerUrl(order.paymentTx, order.currency || '', order.chainId) || undefined
          }
          description={t('order.timeline.fundsSecured')}
          showDivider={false}
        />
      ),
    });
  }

  if (['processing', 'shipped', 'delivered', 'completed'].includes(order.status)) {
    timelineCards.push({
      key: 'accepted',
      timestamp: acceptedEvent?.timestamp,
      priority: 20,
      node: (
        <AcceptedCard
          timestamp={acceptedEvent?.timestamp}
          description={
            order.userRole === 'seller'
              ? t('order.acceptedDescSeller')
              : t('order.acceptedDescBuyer')
          }
          showDivider={false}
        />
      ),
    });
  }

  if (releaseTxHash && releasedEvent) {
    timelineCards.push({
      key: 'released',
      timestamp: releasedEvent.timestamp,
      priority: 30,
      node: (
        <OrderCompleteCard
          title={t('order.stages.released')}
          timestamp={releasedEvent.timestamp}
          amount={order.total}
          currency={order.currency}
          txHash={releaseTxHash}
          txUrl={releaseTxUrl}
          description={t('order.timeline.fundsReleased')}
          showDivider={false}
        />
      ),
    });
  }

  if (order.trackingNumber || ['shipped', 'delivered', 'completed'].includes(order.status)) {
    timelineCards.push({
      key: 'shipped',
      timestamp: shippedEvent?.timestamp,
      priority: 40,
      node: (
        <ShipmentCard
          timestamp={shippedEvent?.timestamp}
          shipper={order.shipper}
          trackingNumber={order.trackingNumber}
          contractType={order.contractType}
          showDivider={false}
        />
      ),
    });
  }

  if (order.status === 'completed') {
    timelineCards.push({
      key: 'completed',
      timestamp: completedEvent?.timestamp,
      priority: 50,
      node: (
        <OrderCompleteCard
          timestamp={completedEvent?.timestamp}
          txHash={completedTxHash}
          txUrl={completedTxUrl}
          description={t('order.timeline.orderCompleted')}
          showDivider={false}
        />
      ),
    });
  }

  timelineCards.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return b.priority - a.priority;
  });

  return (
    <div className={className}>
      <div className="space-y-2">
        {timelineCards.map(entry => (
          <div key={entry.key} className="bg-muted/10 rounded-lg p-2">
            {entry.node}
          </div>
        ))}
      </div>
    </div>
  );
});
