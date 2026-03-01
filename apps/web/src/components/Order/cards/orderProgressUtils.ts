import type { DisplayOrder } from '@mobazha/core';

type TranslateFn = (key: string) => string;

/**
 * Compute progress bar state from order status.
 * Shared between Desktop and Mobile views.
 */
export function getProgressBarState(
  status: DisplayOrder['status'],
  t: TranslateFn,
  hasDispute?: boolean,
  hasDisputeResolution?: boolean
): { states: string[]; currentState: number; disputeState: number } {
  if (
    status === 'disputed' ||
    (hasDispute && !['completed', 'refunded', 'cancelled'].includes(status))
  ) {
    return {
      states: [
        t('order.stages.disputed'),
        t('order.stages.decided'),
        t('order.stages.resolved'),
        t('order.stages.complete'),
      ],
      currentState: status === 'disputed' ? 1 : hasDisputeResolution ? 3 : 2,
      disputeState: 1,
    };
  }

  if (['cancelled', 'refunded'].includes(status)) {
    const endState =
      status === 'cancelled'
        ? t('order.cancelled')
        : status === 'refunded'
          ? t('order.refunded')
          : t('order.stages.declined');
    return { states: [t('order.stages.paid'), endState], currentState: 2, disputeState: 0 };
  }

  const normalStates = [
    t('order.stages.paid'),
    t('order.stages.accepted'),
    t('order.stages.fulfilled'),
    t('order.stages.complete'),
  ];
  let currentState = 0;
  switch (status) {
    case 'awaiting_payment':
      currentState = 0;
      break;
    case 'pending':
    case 'paid':
      currentState = 1;
      break;
    case 'processing':
      currentState = 2;
      break;
    case 'shipped':
    case 'delivered':
      currentState = 3;
      break;
    case 'completed':
      currentState = 4;
      break;
    default:
      currentState = 0;
  }
  return { states: normalStates, currentState, disputeState: 0 };
}

/**
 * Compute human-readable status label from order status.
 */
export function getStatusLabel(status: string, t: TranslateFn): string {
  const statusKeys: Record<string, string> = {
    pending: 'order.pending',
    awaiting_payment: 'order.statusLabels.awaitingPayment',
    paid: 'order.stages.paid',
    processing: 'order.stages.accepted',
    shipped: 'order.stages.fulfilled',
    delivered: 'order.stages.delivered',
    completed: 'order.stages.complete',
    disputed: 'order.stages.disputed',
    cancelled: 'order.statusLabels.cancelled',
    refunded: 'order.statusLabels.refunded',
  };
  const key = statusKeys[status];
  if (key) return t(key);
  return status.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
}
