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

/** i18n key suffix under `collectibles.primarySale.phase.*` */
export type CollectiblePrimarySalePhaseMessageKey =
  | CollectiblePrimarySalePhase
  | 'awaiting_hub_minting'
  | 'awaiting_hub_minted';

export function resolveCollectiblePrimarySalePhaseMessageKey(
  phase: CollectiblePrimarySalePhase,
  sale: CollectiblePrimarySale | null
): CollectiblePrimarySalePhaseMessageKey {
  if (phase !== 'awaiting_hub') {
    return phase;
  }
  const hubSlotStatus = sale?.hubSlotStatus?.trim().toLowerCase();
  if (hubSlotStatus === 'minting') {
    return 'awaiting_hub_minting';
  }
  if (sale?.nftMint?.trim() || hubSlotStatus === 'minted' || hubSlotStatus === 'in_circulation') {
    return 'awaiting_hub_minted';
  }
  return phase;
}

/** i18n key suffix under `collectibles.primarySale.mintErrors.*` */
export type CollectibleMintErrorMessageKey =
  | 'pendingConfirmation'
  | 'onChainFailed'
  | 'interrupted'
  | 'generic';

/** Map backend mint error text to user-facing copy keys. */
export function resolveCollectibleMintErrorMessageKey(
  lastMintError?: string | null
): CollectibleMintErrorMessageKey {
  const message = lastMintError?.trim().toLowerCase() ?? '';
  if (!message) {
    return 'generic';
  }
  if (
    message.includes('submitted but not confirmed') ||
    message.includes('confirmation timeout') ||
    message.includes('mint transaction was submitted but confirmation is unknown')
  ) {
    return 'pendingConfirmation';
  }
  if (message.includes('failed on-chain') || message.includes('failed on chain')) {
    return 'onChainFailed';
  }
  if (message.includes('context canceled') || message.includes('context deadline exceeded')) {
    return 'interrupted';
  }
  return 'generic';
}

/** Extract a Solana transaction signature from a persisted mint error, if present. */
export function parseSubmittedMintTxFromError(lastMintError?: string | null): string | null {
  const message = lastMintError?.trim() ?? '';
  if (!message) {
    return null;
  }
  const txMatch = message.match(/tx=([1-9A-HJ-NP-Za-km-z]+)/);
  return txMatch?.[1] ?? null;
}
