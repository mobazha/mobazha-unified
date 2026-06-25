import { describe, expect, it } from 'vitest';
import {
  isCollectibleRedemptionComplete,
  resolveCollectibleRedemptionPhase,
} from '../../collectibles/redemption';

describe('resolveCollectibleRedemptionPhase', () => {
  it('maps known redemption statuses', () => {
    expect(resolveCollectibleRedemptionPhase({ status: 'redeem_requested' })).toBe(
      'redeem_requested'
    );
    expect(resolveCollectibleRedemptionPhase({ status: 'SHIPPED' })).toBe('shipped');
    expect(resolveCollectibleRedemptionPhase({ status: 'settled' })).toBe('settled');
  });

  it('defaults unknown status to redeem_requested', () => {
    expect(resolveCollectibleRedemptionPhase({ status: 'pending' })).toBe('redeem_requested');
    expect(resolveCollectibleRedemptionPhase(null)).toBe('redeem_requested');
  });
});

describe('isCollectibleRedemptionComplete', () => {
  it('is true only when settled', () => {
    expect(isCollectibleRedemptionComplete({ status: 'settled' })).toBe(true);
    expect(isCollectibleRedemptionComplete({ status: 'shipped' })).toBe(false);
  });
});
