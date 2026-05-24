'use client';

import React, { memo, useMemo } from 'react';
import { useI18n, type DisplayOrder, type SettlementActionSnapshot } from '@mobazha/core';
import type { Order as CoreOrder } from '@mobazha/core';
import { OrderCompleteCard, ShipmentCard, AcceptedCard } from '@/components/Order';
import { getBlockExplorerUrl } from '@/components/Order/utils';

export interface OrderTimelineCardProps {
  displayOrder: DisplayOrder;
  coreOrder?: CoreOrder | null;
  /** Primary settlement action (refund / release) for cancelled or completed orders */
  settlementAction?: SettlementActionSnapshot | null;
  className?: string;
}

type TimelineCardEntry = {
  key: string;
  timestamp?: string;
  priority: number;
  node: React.ReactNode;
};

function sortTimelineCards(cards: TimelineCardEntry[]): TimelineCardEntry[] {
  return [...cards].sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return b.priority - a.priority;
  });
}

function buildCompletedTimelineCards(
  order: DisplayOrder,
  t: (key: string) => string
): TimelineCardEntry[] {
  const paymentEvent = order.timeline.find(e => e.status === 'paid');
  const acceptedEvent = order.timeline.find(e => e.status === 'processing');
  const shippedEvent = order.timeline.find(e => e.status === 'shipped');
  const releasedEvent = order.timeline.find(e => e.status === 'released');
  const completedEvent = order.timeline.find(e => e.status === 'completed');

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
          stageVariant="escrowed"
          title={t('order.stages.escrowed')}
          timestamp={paymentEvent.timestamp}
          amount={order.total}
          currency={order.currency}
          paymentCoin={order.paymentCoin}
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
          stageVariant="released"
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
          stageVariant="complete"
          timestamp={completedEvent?.timestamp}
          txHash={completedTxHash}
          txUrl={completedTxUrl}
          description={t('order.timeline.orderCompleted')}
          showDivider={false}
        />
      ),
    });
  }

  return sortTimelineCards(timelineCards);
}

function buildCancelledTimelineCards(
  order: DisplayOrder,
  settlementAction: SettlementActionSnapshot | null | undefined,
  t: (key: string) => string
): TimelineCardEntry[] {
  const paymentEvent = order.timeline.find(e => e.status === 'paid');
  const cancelledEvent = order.timeline.find(e => e.status === 'cancelled');
  const cancellation = order.cancellation;
  const wasFunded = cancellation?.wasFunded ?? !!order.paymentTx;
  const isDeclined = cancellation?.kind === 'seller_decline';

  const timelineCards: TimelineCardEntry[] = [];

  if (wasFunded && order.paymentTx) {
    timelineCards.push({
      key: 'paid',
      timestamp: paymentEvent?.timestamp,
      priority: 10,
      node: (
        <OrderCompleteCard
          stageVariant="escrowed"
          title={t('order.stages.escrowed')}
          timestamp={paymentEvent?.timestamp}
          amount={order.total}
          currency={order.currency}
          paymentCoin={order.paymentCoin}
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

  timelineCards.push({
    key: 'cancelled',
    timestamp: cancelledEvent?.timestamp,
    priority: 20,
    node: (
      <OrderCompleteCard
        stageVariant={isDeclined ? 'declined' : 'cancelled'}
        title={isDeclined ? t('order.timeline.orderDeclined') : t('order.timeline.orderCancelled')}
        timestamp={cancelledEvent?.timestamp}
        description={order.cancelReason || undefined}
        showDivider={false}
      />
    ),
  });

  const refundTx = settlementAction?.txHash?.trim();
  if (cancellation?.refundConfirmed && refundTx) {
    timelineCards.push({
      key: 'refund',
      timestamp: settlementAction?.updatedAt || cancelledEvent?.timestamp,
      priority: 30,
      node: (
        <OrderCompleteCard
          stageVariant="refund"
          title={t('order.timeline.refunded')}
          timestamp={settlementAction?.updatedAt || cancelledEvent?.timestamp}
          amount={wasFunded ? order.total : undefined}
          currency={wasFunded ? order.currency : undefined}
          txHash={refundTx}
          txUrl={getBlockExplorerUrl(refundTx, order.currency || '', order.chainId) || undefined}
          description={t('order.timeline.refundOnChain')}
          showDivider={false}
        />
      ),
    });
  }

  return sortTimelineCards(timelineCards);
}

export const OrderTimelineCard = memo(function OrderTimelineCard({
  displayOrder: order,
  settlementAction,
  className,
}: OrderTimelineCardProps) {
  const { t } = useI18n();

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

  const timelineCards =
    order.status === 'cancelled'
      ? buildCancelledTimelineCards(order, settlementAction, t)
      : buildCompletedTimelineCards(order, t);

  if (timelineCards.length === 0) return null;

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
