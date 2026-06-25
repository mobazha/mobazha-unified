import type { CollectibleRedemption } from './types';

export type CollectibleRedemptionPhase = 'redeem_requested' | 'shipped' | 'settled';

const REDEMPTION_PHASES: CollectibleRedemptionPhase[] = ['redeem_requested', 'shipped', 'settled'];

export function resolveCollectibleRedemptionPhase(
  redemption: Pick<CollectibleRedemption, 'status'> | null | undefined
): CollectibleRedemptionPhase {
  const normalized = (redemption?.status || '').trim().toLowerCase();
  if (REDEMPTION_PHASES.includes(normalized as CollectibleRedemptionPhase)) {
    return normalized as CollectibleRedemptionPhase;
  }
  return 'redeem_requested';
}

export function isCollectibleRedemptionComplete(
  redemption: Pick<CollectibleRedemption, 'status'> | null | undefined
): boolean {
  return resolveCollectibleRedemptionPhase(redemption) === 'settled';
}
