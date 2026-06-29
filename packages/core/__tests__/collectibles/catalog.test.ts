import { describe, expect, it } from 'vitest';
import {
  isCollectibleCatalogRedeemable,
  isCollectiblesPublicCatalogUnavailableError,
  resolveCollectibleCatalogDisplay,
  shouldQueryCollectibleRedemptionByMint,
} from '../../collectibles/catalog';
import { ApiError } from '../../services/api/client';

const t = (key: string) => key;

const REAL_M2_WILSON_NFT = {
  nftMint: 'mockpnft63e66626bd4e442e77e0e953d61226dc5512',
  hubSlotID: 'source_9591a58c-4f55-4e57-a151-9b4a0558a238',
  hubSlot: {
    hubSlotID: 'source_9591a58c-4f55-4e57-a151-9b4a0558a238',
    certNumber: 'M2-WILSON-001',
    serial: 'WILSON-001',
    hubLocation: 'source-custody',
    status: 'in_circulation',
    grade: 'PSA 10',
  },
} as const;

describe('isCollectiblesPublicCatalogUnavailableError', () => {
  it('returns true for missing or feature-guarded public catalog responses', () => {
    expect(isCollectiblesPublicCatalogUnavailableError(new ApiError('Not found', 404))).toBe(true);
    expect(isCollectiblesPublicCatalogUnavailableError(new ApiError('Forbidden', 403))).toBe(true);
    expect(
      isCollectiblesPublicCatalogUnavailableError(new ApiError('Not found', 404, 'not_found'))
    ).toBe(true);
    expect(
      isCollectiblesPublicCatalogUnavailableError(
        new ApiError('Feature disabled', 403, 'feature_disabled')
      )
    ).toBe(true);
  });

  it('returns false for transient or operational errors', () => {
    expect(isCollectiblesPublicCatalogUnavailableError(new ApiError('Server error', 500))).toBe(
      false
    );
    expect(isCollectiblesPublicCatalogUnavailableError(new Error('Network error'))).toBe(false);
  });
});

describe('shouldQueryCollectibleRedemptionByMint', () => {
  const burnedNft = {
    nftMint: 'mint-abc',
    burnAt: '2026-01-01T00:00:00Z',
  };

  it('requires authentication and a burned NFT with mint', () => {
    expect(shouldQueryCollectibleRedemptionByMint(true, burnedNft)).toBe(true);
    expect(shouldQueryCollectibleRedemptionByMint(false, burnedNft)).toBe(false);
    expect(shouldQueryCollectibleRedemptionByMint(true, { ...burnedNft, burnAt: undefined })).toBe(
      false
    );
    expect(shouldQueryCollectibleRedemptionByMint(true, { ...burnedNft, nftMint: '' })).toBe(false);
    expect(shouldQueryCollectibleRedemptionByMint(true, null)).toBe(false);
  });
});

describe('resolveCollectibleCatalogDisplay', () => {
  it('maps M2-WILSON-001 by certNumber to bundled Honus Wagner art and source custody status', () => {
    const display = resolveCollectibleCatalogDisplay(REAL_M2_WILSON_NFT, t);

    expect(display.hasDemoMapping).toBe(true);
    expect(display.displayName).toBe('collectibles.catalog.display.m2Wilson001.name');
    expect(display.grade).toBe('PSA 10');
    expect(display.imageUrl).toBe(
      '/images/demo-cards/m2-wilson-sports-card-demo-001-psa-10-testnet.jpg'
    );
    expect(display.redeemable).toBe(true);
    expect(display.custodyStatusKey).toBe('collectibles.catalog.custody.sourceCustody');
  });

  it('maps the same demo entry by nft mint or hub slot id', () => {
    const byMint = resolveCollectibleCatalogDisplay(
      {
        nftMint: REAL_M2_WILSON_NFT.nftMint,
        hubSlotID: 'unrelated-slot',
      },
      t
    );
    const bySlot = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'unknown-mint',
        hubSlotID: REAL_M2_WILSON_NFT.hubSlotID,
      },
      t
    );

    expect(byMint.hasDemoMapping).toBe(true);
    expect(bySlot.hasDemoMapping).toBe(true);
  });

  it('does not map unknown real cards that only share a misleading hub slot label', () => {
    const display = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'unknown-mint',
        hubSlotID: 'M2-WILSON-001',
        hubSlot: {
          hubSlotID: 'M2-WILSON-001',
          certNumber: 'PSA 99999999',
          serial: 'OTHER-001',
          status: 'in_circulation',
        },
      },
      t
    );

    expect(display.hasDemoMapping).toBe(false);
    expect(display.displayName).toBe('PSA 99999999');
    expect(display.imageUrl).toBeUndefined();
  });

  it('falls back to cert number and unknown custody for unmapped cards', () => {
    const display = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'unknown-mint',
        hubSlotID: 'slot-unknown',
        hubSlot: {
          hubSlotID: 'slot-unknown',
          certNumber: 'PSA 99999999',
          status: 'submitted',
        },
      },
      t
    );

    expect(display.hasDemoMapping).toBe(false);
    expect(display.displayName).toBe('PSA 99999999');
    expect(display.imageUrl).toBeUndefined();
    expect(display.redeemable).toBe(false);
    expect(display.custodyStatusKey).toBe('collectibles.catalog.custody.pending');
  });

  it('marks burned cards as redeemed and not redeemable', () => {
    const display = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'burned-mint',
        hubSlotID: 'slot-burned',
        burnAt: '2026-01-01T00:00:00Z',
        hubSlot: {
          hubSlotID: 'slot-burned',
          certNumber: 'PSA 1',
          status: 'in_circulation',
        },
      },
      t
    );

    expect(display.redeemable).toBe(false);
    expect(display.credentialActionsBlocked).toBe(true);
    expect(display.validityStatusKey).toBe('collectibles.validity.burned');
    expect(display.custodyStatusKey).toBe('collectibles.catalog.custody.redeemed');
    expect(
      isCollectibleCatalogRedeemable({
        burnAt: '2026-01-01',
        hubSlot: { hubSlotID: 'x', certNumber: 'x', status: 'minted' },
      })
    ).toBe(false);
  });

  it('blocks redemption for voided credentials', () => {
    const display = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'voided-mint',
        hubSlotID: 'slot-voided',
        validityStatus: 'voided',
        invalidationReason: 'Refunded after default',
        hubSlot: {
          hubSlotID: 'slot-voided',
          certNumber: 'PSA 2',
          status: 'in_circulation',
        },
      },
      t
    );

    expect(display.validityStatusKey).toBe('collectibles.validity.voided');
    expect(display.redeemable).toBe(false);
    expect(display.credentialActionsBlocked).toBe(true);
  });
});
