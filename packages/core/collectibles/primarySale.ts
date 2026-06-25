import type { CollectiblePrimarySale, CollectiblePrimarySalePhase } from './types';

/** Map hosting primary-sale row + payment flag to a user-facing phase. */
export function resolveCollectiblePrimarySalePhase(
  sale: CollectiblePrimarySale | null,
  orderPaymentVerified: boolean
): CollectiblePrimarySalePhase {
  if (!orderPaymentVerified) {
    return 'awaiting_payment';
  }
  if (!sale) {
    return 'awaiting_bridge';
  }
  if (!sale.paidAt) {
    return 'awaiting_payment';
  }
  const releaseStatus = (sale.releaseStatus || '').toLowerCase();
  if (releaseStatus === 'released' || sale.releasedAt) {
    return 'payout_complete';
  }
  if (releaseStatus === 'failed') {
    return 'payout_failed';
  }
  if (sale.releaseRequestedAt) {
    return 'payout_pending';
  }
  return 'awaiting_hub';
}
