import { describe, expect, it } from 'vitest';
import {
  COLLECTIBLE_METADATA_KEYS,
  isCollectiblePrimarySaleOrder,
  parseCollectibleOrderMetadata,
} from '../../collectibles/order';
import { resolveCollectiblePrimarySalePhase } from '../../collectibles/primarySale';
import type { CollectiblePrimarySale } from '../../collectibles/types';

describe('parseCollectibleOrderMetadata', () => {
  it('restores fiat metadata bridge payload', () => {
    const meta = parseCollectibleOrderMetadata({
      [COLLECTIBLE_METADATA_KEYS.fulfillment]: 'nft',
      [COLLECTIBLE_METADATA_KEYS.hubSlotId]: 'slot-1',
      [COLLECTIBLE_METADATA_KEYS.certNumber]: 'PSA-9',
    });
    expect(meta).toMatchObject({
      fulfillment: 'nft',
      hubSlotID: 'slot-1',
      certNumber: 'PSA-9',
      type: 'collectible_primary_sale',
    });
  });

  it('returns null for unrelated fiat metadata', () => {
    expect(parseCollectibleOrderMetadata({ fiat_provider: 'stripe' })).toBeNull();
  });
});

describe('isCollectiblePrimarySaleOrder', () => {
  it('detects hub nft orders', () => {
    expect(
      isCollectiblePrimarySaleOrder({
        [COLLECTIBLE_METADATA_KEYS.fulfillment]: 'nft',
        [COLLECTIBLE_METADATA_KEYS.hubSlotId]: 'slot-1',
      })
    ).toBe(true);
  });
});

describe('resolveCollectiblePrimarySalePhase', () => {
  const baseSale: CollectiblePrimarySale = {
    saleID: 'sale-1',
    hubSlotID: 'slot-1',
    paidAt: '2026-06-25T00:00:00Z',
    releaseStatus: 'pending',
  };

  it('awaits payment when order not verified', () => {
    expect(resolveCollectiblePrimarySalePhase(baseSale, false)).toBe('awaiting_payment');
  });

  it('awaits bridge when paid but no sale row', () => {
    expect(resolveCollectiblePrimarySalePhase(null, true)).toBe('awaiting_bridge');
  });

  it('awaits hub after paid before release request', () => {
    expect(resolveCollectiblePrimarySalePhase({ ...baseSale }, true)).toBe('awaiting_hub');
  });

  it('pending payout when release requested', () => {
    expect(
      resolveCollectiblePrimarySalePhase(
        { ...baseSale, releaseRequestedAt: '2026-06-25T01:00:00Z' },
        true
      )
    ).toBe('payout_pending');
  });

  it('complete when released', () => {
    expect(
      resolveCollectiblePrimarySalePhase(
        {
          ...baseSale,
          releaseStatus: 'released',
          releasedAt: '2026-06-25T02:00:00Z',
        },
        true
      )
    ).toBe('payout_complete');
  });
});
