type TranslateFn = (key: string) => string;

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
