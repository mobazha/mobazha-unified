'use client';

import React, { memo, useMemo } from 'react';
import {
  useI18n,
  isFiatPaymentCoin,
  resolveOrderPricingDisplay,
  type DisplayOrder,
  type SettlementActionSnapshot,
} from '@mobazha/core';
import type { Order as CoreOrder } from '@mobazha/core';
import { OrderCompleteCard, ShipmentCard, AcceptedCard } from '@/components/Order';
import { getOrderTransactionExplorerUrl } from '@/components/Order/utils';

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

function isFiatOrderPayment(order: DisplayOrder): boolean {
  return !!order.fiatPayment || isFiatPaymentCoin(order.paymentCoin);
}

function getOrderPricingProps(order: DisplayOrder) {
  const pricing = resolveOrderPricingDisplay({
    pricingBreakdown: order.pricingBreakdown,
    pricingAmount: order.pricingAmount,
    pricingCurrency: order.pricingCurrency,
  });
  return {
    pricingAmount: pricing?.amount,
    pricingCurrency: pricing?.currency,
  };
}

function buildOrderPlacedCard(
  order: DisplayOrder,
  t: (key: string) => string
): TimelineCardEntry | null {
  const createdEvent = order.timeline.find(event => event.status === 'created');
  const timestamp = createdEvent?.timestamp || order.createdAt;
  if (!timestamp) return null;

  return {
    key: 'placed',
    timestamp,
    priority: 0,
    node: (
      <OrderCompleteCard
        stageVariant="complete"
        title={t('order.timeline.orderPlaced')}
        timestamp={timestamp}
        description={t('order.orderPlaced')}
        showDivider={false}
      />
    ),
  };
}

function getPaidTimelineDisplay(order: DisplayOrder, t: (key: string) => string) {
  const isFiatPayment = isFiatOrderPayment(order);
  return {
    title: isFiatPayment ? t('order.fiatPayment.timelineTitle') : t('order.stages.escrowed'),
    amount: isFiatPayment ? order.pricingAmount || order.total : order.total,
    currency: isFiatPayment ? order.pricingCurrency || order.currency : order.currency,
    paymentCoin: isFiatPayment ? undefined : order.paymentCoin,
    amountLabel: isFiatPayment ? t('order.fiatPayment.amount') : undefined,
    txLabel: isFiatPayment ? t('order.fiatPayment.transactionId') : undefined,
    description: isFiatPayment
      ? t('order.fiatPayment.timelineDescription')
      : t('order.timeline.fundsSecured'),
  };
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
  const releaseAmount = order.settlementBreakdown?.sellerAmount || order.total;
  const settlementLineLabel = (type: string): string => {
    switch (type) {
      case 'buyer':
        return t('order.buyer');
      case 'moderator':
        return t('order.moderatorFee');
      case 'platform':
        return t('order.platformFee');
      case 'network_fee':
        return t('order.networkFee');
      case 'seller':
      default:
        return t('order.seller');
    }
  };
  const releaseBreakdownLines =
    order.settlementBreakdown?.lines
      ?.filter(line => line.type !== 'seller')
      .map(line => ({
        label: settlementLineLabel(line.type),
        amount: `${line.amount} ${order.currency}`,
      })) || [];

  const releaseTxHash =
    order.releaseTx && order.releaseTx !== order.paymentTx ? order.releaseTx : undefined;
  const releaseTxUrl = releaseTxHash
    ? getOrderTransactionExplorerUrl(releaseTxHash, order) || undefined
    : undefined;
  const completedTxHash =
    !order.fundsReleasedAtConfirmation && !releaseTxHash
      ? order.releaseTx || order.paymentTx
      : undefined;
  const completedTxUrl = completedTxHash
    ? getOrderTransactionExplorerUrl(completedTxHash, order) || undefined
    : undefined;

  const timelineCards: TimelineCardEntry[] = [];
  const paidTimeline = getPaidTimelineDisplay(order, t);
  const pricingProps = getOrderPricingProps(order);

  if (paymentEvent) {
    const paymentTxUrl = order.paymentTx
      ? getOrderTransactionExplorerUrl(order.paymentTx, order) || undefined
      : undefined;
    timelineCards.push({
      key: 'paid',
      timestamp: paymentEvent.timestamp,
      priority: 10,
      node: (
        <OrderCompleteCard
          stageVariant="escrowed"
          title={paidTimeline.title}
          timestamp={paymentEvent.timestamp}
          amount={paidTimeline.amount}
          currency={paidTimeline.currency}
          paymentCoin={paidTimeline.paymentCoin}
          {...pricingProps}
          amountLabel={paidTimeline.amountLabel}
          txHash={order.paymentTx}
          txLabel={paidTimeline.txLabel}
          txUrl={paymentTxUrl}
          description={paidTimeline.description}
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
          amount={releaseAmount}
          currency={order.currency}
          paymentCoin={order.paymentCoin}
          amountLabel={t('order.sellerPayout')}
          breakdownLines={releaseBreakdownLines}
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

  const placedCard = buildOrderPlacedCard(order, t);
  if (placedCard) timelineCards.push(placedCard);

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
  const paidTimeline = getPaidTimelineDisplay(order, t);
  const pricingProps = getOrderPricingProps(order);

  if (wasFunded && order.paymentTx) {
    timelineCards.push({
      key: 'paid',
      timestamp: paymentEvent?.timestamp,
      priority: 10,
      node: (
        <OrderCompleteCard
          stageVariant="escrowed"
          title={paidTimeline.title}
          timestamp={paymentEvent?.timestamp}
          amount={paidTimeline.amount}
          currency={paidTimeline.currency}
          paymentCoin={paidTimeline.paymentCoin}
          {...pricingProps}
          amountLabel={paidTimeline.amountLabel}
          txHash={order.paymentTx}
          txLabel={paidTimeline.txLabel}
          txUrl={getOrderTransactionExplorerUrl(order.paymentTx, order) || undefined}
          description={paidTimeline.description}
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
          paymentCoin={wasFunded ? order.paymentCoin : undefined}
          txHash={refundTx}
          txUrl={getOrderTransactionExplorerUrl(refundTx, order) || undefined}
          description={t('order.timeline.refundOnChain')}
          showDivider={false}
        />
      ),
    });
  }

  const placedCard = buildOrderPlacedCard(order, t);
  if (placedCard) timelineCards.push(placedCard);

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
      !!order.createdAt ||
      order.status === 'completed' ||
      order.status === 'cancelled' ||
      !!order.paymentTx ||
      !!order.releaseTx ||
      !!order.trackingNumber ||
      ['processing', 'shipped', 'delivered', 'completed'].includes(order.status)
    );
  }, [order.createdAt, order.status, order.trackingNumber, order.paymentTx, order.releaseTx]);

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
