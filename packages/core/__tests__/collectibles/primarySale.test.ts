import { describe, expect, it } from 'vitest';
import {
  COLLECTIBLE_METADATA_KEYS,
  isCollectiblePrimarySaleOrder,
  parseCollectibleOrderMetadata,
} from '../../collectibles/order';
import {
  resolveCollectiblePrimarySalePhase,
  resolveCollectiblePrimarySalePhaseMessageKey,
  resolveCollectibleMintErrorMessageKey,
  parseSubmittedMintTxFromError,
} from '../../collectibles/primarySale';
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

describe('resolveCollectiblePrimarySalePhaseMessageKey', () => {
  it('uses minting hub copy when slot is minting during awaiting_hub', () => {
    expect(
      resolveCollectiblePrimarySalePhaseMessageKey('awaiting_hub', {
        saleID: 'sale-1',
        hubSlotID: 'slot-1',
        hubSlotStatus: 'minting',
        paidAt: '2026-06-25T00:00:00Z',
      })
    ).toBe('awaiting_hub_minting');
  });

  it('uses minted hub copy when nft mint exists during awaiting_hub', () => {
    expect(
      resolveCollectiblePrimarySalePhaseMessageKey('awaiting_hub', {
        saleID: 'sale-1',
        hubSlotID: 'slot-1',
        nftMint: 'mint-abc',
        paidAt: '2026-06-25T00:00:00Z',
      })
    ).toBe('awaiting_hub_minted');
  });

  it('uses minted hub copy when slot is already minted', () => {
    expect(
      resolveCollectiblePrimarySalePhaseMessageKey('awaiting_hub', {
        saleID: 'sale-1',
        hubSlotID: 'slot-1',
        hubSlotStatus: 'minted',
        paidAt: '2026-06-25T00:00:00Z',
      })
    ).toBe('awaiting_hub_minted');
  });

  it('keeps phase key when nft mint missing', () => {
    expect(
      resolveCollectiblePrimarySalePhaseMessageKey('awaiting_hub', {
        saleID: 'sale-1',
        hubSlotID: 'slot-1',
        paidAt: '2026-06-25T00:00:00Z',
      })
    ).toBe('awaiting_hub');
  });
});

describe('resolveCollectibleMintErrorMessageKey', () => {
  it('maps confirmation timeout to pending confirmation copy', () => {
    expect(
      resolveCollectibleMintErrorMessageKey(
        'collectible nft provider not implemented: pNFT mint transaction abc was submitted but not confirmed (tx=submitted-tx)'
      )
    ).toBe('pendingConfirmation');
  });

  it('maps on-chain failure to dedicated copy', () => {
    expect(
      resolveCollectibleMintErrorMessageKey('pNFT mint transaction failed on-chain: boom')
    ).toBe('onChainFailed');
  });

  it('falls back to generic copy', () => {
    expect(resolveCollectibleMintErrorMessageKey('mint failed')).toBe('generic');
  });
});

describe('parseSubmittedMintTxFromError', () => {
  it('extracts tx signature when present', () => {
    expect(
      parseSubmittedMintTxFromError(
        'confirmation timeout (nftMint=abc tx=5VERv8NMzzbY7xB35r3bAbcdefghijkmnopqrstuvwxyz)'
      )
    ).toBe('5VERv8NMzzbY7xB35r3bAbcdefghijkmnopqrstuvwxyz');
  });
});
