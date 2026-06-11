'use client';

import React, { memo, useMemo } from 'react';
import {
  useI18n,
  isFiatPaymentCoin,
  resolveOrderPricingDisplay,
  isDisputeRulingAvailable,
  getDisputeResolutionHeadline,
  getDisputeSettlementPayoutLines,
  shouldShowDisputeArchiveCard,
  isMeaningfulAmount,
  getAcceptedDescSellerKey,
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
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : Number.NEGATIVE_INFINITY;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : Number.NEGATIVE_INFINITY;
    if (aTime !== bTime) return bTime - aTime;
    return b.priority - a.priority;
  });
}

function firstValidTimestamp(...candidates: (string | undefined)[]): string | undefined {
  for (const ts of candidates) {
    if (!ts?.trim()) continue;
    const ms = new Date(ts).getTime();
    if (!Number.isNaN(ms)) return ts;
  }
  return undefined;
}

function latestTimelineTimestamp(order: DisplayOrder): string | undefined {
  let maxMs = Number.NEGATIVE_INFINITY;
  let best: string | undefined;
  for (const event of order.timeline) {
    const ms = new Date(event.timestamp).getTime();
    if (!Number.isNaN(ms) && ms > maxMs) {
      maxMs = ms;
      best = event.timestamp;
    }
  }
  return best;
}

function resolveSettlementTimestamp(
  order: DisplayOrder,
  ...candidates: (string | undefined)[]
): string | undefined {
  return firstValidTimestamp(
    ...candidates,
    order.dispute?.acceptedAt,
    order.timeline.find(event => event.status === 'completed')?.timestamp,
    latestTimelineTimestamp(order)
  );
}

/** Resolved disputes are covered by the ruling card — skip duplicate seller-oriented release row. */
function shouldOmitReleasedTimelineCard(order: DisplayOrder): boolean {
  const dispute = order.dispute;
  if (!dispute || !isDisputeRulingAvailable(dispute)) return false;
  return order.status === 'completed' || order.status === 'split_resolved';
}

function resolveReleaseDisplay(
  order: DisplayOrder,
  t: (key: string) => string
): {
  amount?: string;
  amountLabel: string;
  description: string;
  breakdownLines: Array<{ label: string; amount: string }>;
} {
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

  const breakdown = order.settlementBreakdown;
  const dispute = order.dispute;
  const buyerAmount = breakdown?.buyerAmount || dispute?.buyerPayoutAmount;
  const sellerAmount = breakdown?.sellerAmount || dispute?.vendorPayoutAmount;
  const buyerReceives =
    dispute?.resolution === 'buyer' ||
    (isMeaningfulAmount(buyerAmount) && !isMeaningfulAmount(sellerAmount));
  const splitRelease =
    dispute?.resolution === 'split' ||
    (isMeaningfulAmount(buyerAmount) && isMeaningfulAmount(sellerAmount));

  const releaseBreakdownLines =
    breakdown?.lines
      ?.filter(line => line.type !== 'seller' && line.type !== 'buyer')
      .map(line => ({
        label: settlementLineLabel(line.type),
        amount: `${line.amount} ${order.currency}`,
      })) || [];

  if (buyerReceives) {
    return {
      amount: buyerAmount || order.total,
      amountLabel: t('order.buyerPayout'),
      description: t('order.timeline.fundsReleasedToBuyer'),
      breakdownLines: releaseBreakdownLines,
    };
  }

  if (splitRelease) {
    const splitLines = dispute
      ? getDisputeSettlementPayoutLines(dispute, breakdown, t, {
          paymentCoin: order.paymentCoin,
        }).map(line => ({
          label: line.label,
          amount: line.amount,
        }))
      : breakdown?.lines?.map(line => ({
          label: settlementLineLabel(line.type),
          amount: `${line.amount} ${order.currency}`,
        })) || [];
    return {
      amount: undefined,
      amountLabel: '',
      description: t('order.timeline.disputeFundsReleased'),
      breakdownLines: splitLines.length > 0 ? splitLines : releaseBreakdownLines,
    };
  }

  return {
    amount: breakdown?.sellerAmount || order.total,
    amountLabel: t('order.sellerPayout'),
    description: t('order.timeline.fundsReleased'),
    breakdownLines: releaseBreakdownLines,
  };
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
  const releaseDisplay = resolveReleaseDisplay(order, t);
  const releaseBreakdownLines = releaseDisplay.breakdownLines;

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
              ? t(getAcceptedDescSellerKey(order.contractType))
              : t('order.acceptedDescBuyer')
          }
          showDivider={false}
        />
      ),
    });
  }

  if (releaseTxHash && releasedEvent && !shouldOmitReleasedTimelineCard(order)) {
    const releasedTimestamp = resolveSettlementTimestamp(order, releasedEvent.timestamp);
    timelineCards.push({
      key: 'released',
      timestamp: releasedTimestamp,
      priority: 30,
      node: (
        <OrderCompleteCard
          stageVariant="released"
          title={t('order.stages.released')}
          timestamp={releasedTimestamp}
          amount={releaseDisplay.amount}
          currency={order.currency}
          paymentCoin={order.paymentCoin}
          amountLabel={releaseDisplay.amountLabel}
          breakdownLines={releaseBreakdownLines}
          txHash={releaseTxHash}
          txUrl={releaseTxUrl}
          description={releaseDisplay.description}
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
    const completedTimestamp = firstValidTimestamp(
      completedEvent?.timestamp,
      order.dispute?.acceptedAt
    );
    timelineCards.push({
      key: 'completed',
      timestamp: completedTimestamp,
      priority: order.dispute?.resolvedAt ? 53 : 50,
      node: (
        <OrderCompleteCard
          stageVariant="complete"
          timestamp={completedTimestamp}
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

  timelineCards.push(...buildDisputeTimelineCards(order, t));

  return sortTimelineCards(timelineCards);
}

function buildDisputeTimelineCards(
  order: DisplayOrder,
  t: (key: string, params?: Record<string, string | number>) => string
): TimelineCardEntry[] {
  const dispute = order.dispute;
  if (!dispute) return [];

  const cards: TimelineCardEntry[] = [];
  const compactRulingTimeline = shouldShowDisputeArchiveCard(dispute, order.status);
  const payoutBreakdown =
    isDisputeRulingAvailable(dispute) && !compactRulingTimeline
      ? getDisputeSettlementPayoutLines(dispute, order.settlementBreakdown, t, {
          paymentCoin: order.paymentCoin,
        }).map(line => ({
          label: line.label,
          amount: line.amount,
        }))
      : [];

  if (dispute.resolvedAt && isDisputeRulingAvailable(dispute)) {
    const headline = getDisputeResolutionHeadline(dispute, t);
    const releaseTx =
      order.settlementBreakdown?.source === 'dispute' ||
      order.settlementBreakdown?.source === 'settlement_action'
        ? order.settlementBreakdown.txHash
        : order.releaseTx;
    cards.push({
      key: 'dispute-ruling',
      timestamp: dispute.resolvedAt,
      priority: 52,
      node: (
        <OrderCompleteCard
          stageVariant="released"
          title={t('order.timeline.disputeRulingIssued')}
          timestamp={dispute.resolvedAt}
          description={headline || dispute.resolutionText}
          breakdownLines={payoutBreakdown.length > 0 ? payoutBreakdown : undefined}
          txHash={releaseTx}
          txUrl={
            releaseTx ? getOrderTransactionExplorerUrl(releaseTx, order) || undefined : undefined
          }
          showDivider={false}
        />
      ),
    });
  }

  if (dispute.openedAt) {
    cards.push({
      key: 'dispute-opened',
      timestamp: dispute.openedAt,
      priority: 12,
      node: (
        <OrderCompleteCard
          stageVariant="escrowed"
          title={t('order.timeline.disputeOpened')}
          timestamp={dispute.openedAt}
          description={dispute.claim}
          showDivider={false}
        />
      ),
    });
  }

  return cards;
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
