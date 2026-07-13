// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  isCollectibleCatalogRedeemable,
  isCollectibleSyntheticCatalogIdentifier,
  isCollectiblesPublicCatalogUnavailableError,
  resolveCollectibleCatalogDisplay,
  shortenCollectibleProofReference,
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
    expect(display.hasDigitalTitle).toBe(false);
    expect(display.imageUrl).toBeUndefined();
    expect(display.redeemable).toBe(false);
    expect(display.custodyStatusKey).toBe('collectibles.catalog.custody.pending');
  });

  it('uses human-readable serial fallback instead of raw hub slot ids', () => {
    const display = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'unknown-mint',
        hubSlotID: 'slot-serial-only',
        hubSlot: {
          hubSlotID: 'slot-serial-only',
          serial: 'DEMO-SERIAL-999',
          status: 'submitted',
        },
      },
      t
    );

    expect(display.displayName).toBe('collectibles.catalog.display.serialCard');
    expect(display.displayName).not.toContain('9591a58c');
  });

  it('replaces E2E seed cert identifiers with a graded collectible title', () => {
    const display = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'e2e-mint',
        hubSlotID: 'slot-e2e',
        hubSlot: {
          hubSlotID: 'slot-e2e',
          certNumber: 'E2E-SEED-PSA-1783-ABCD-EFGH',
          grade: 'PSA 10',
          status: 'in_circulation',
        },
      },
      t
    );

    expect(display.displayName).toBe('collectibles.catalog.display.gradedCollectible');
    expect(display.displayName).not.toContain('E2E-SEED');
    expect(display.certificationReference).toBe(
      shortenCollectibleProofReference('E2E-SEED-PSA-1783-ABCD-EFGH')
    );
  });

  it('replaces SER-SEED serials with a graded collectible title', () => {
    const display = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'seed-mint',
        hubSlotID: 'slot-ser-seed',
        hubSlot: {
          hubSlotID: 'slot-ser-seed',
          serial: 'SER-SEED-1783-ABCD-EFGH',
          grade: 'PSA 10',
          status: 'in_circulation',
        },
      },
      t
    );

    expect(display.displayName).toBe('collectibles.catalog.display.gradedCollectible');
    expect(display.displayName).not.toContain('SER-SEED');
    expect(display.serialReference).toBe(
      shortenCollectibleProofReference('SER-SEED-1783-ABCD-EFGH')
    );
  });

  it('replaces SER-COLLATERAL funded and unfunded serials with graded collectible titles', () => {
    for (const serial of ['SER-COLLATERAL-FUNDED-1783-ABCD', 'SER-COLLATERAL-UNFUNDED-1783-ABCD']) {
      const display = resolveCollectibleCatalogDisplay(
        {
          nftMint: 'collateral-mint',
          hubSlotID: 'slot-collateral',
          hubSlot: {
            hubSlotID: 'slot-collateral',
            serial,
            grade: 'PSA 10',
            status: 'submitted',
          },
        },
        t
      );

      expect(display.displayName).toBe('collectibles.catalog.display.gradedCollectible');
      expect(display.displayName).not.toContain('SER-COLLATERAL');
      expect(display.serialReference).toBe(shortenCollectibleProofReference(serial));
    }
  });

  it('preserves normal user-supplied cert numbers as the product title', () => {
    const display = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'mint-user',
        hubSlotID: 'slot-user',
        hubSlot: {
          hubSlotID: 'slot-user',
          certNumber: 'PSA 12345678',
          grade: 'PSA 10',
          status: 'in_circulation',
        },
      },
      t
    );

    expect(display.displayName).toBe('PSA 12345678');
    expect(display.certificationReference).toBeUndefined();
    expect(display.serialReference).toBeUndefined();
  });

  it('preserves legitimate human serials in the product title', () => {
    const display = resolveCollectibleCatalogDisplay(
      {
        nftMint: 'mint-human-serial',
        hubSlotID: 'slot-human-serial',
        hubSlot: {
          hubSlotID: 'slot-human-serial',
          serial: 'WILSON-001',
          grade: 'PSA 10',
          status: 'in_circulation',
        },
      },
      t
    );

    expect(display.displayName).toBe('collectibles.catalog.display.serialCard');
    expect(display.serialReference).toBeUndefined();
  });

  it('marks digital title presence when mint exists and credential is active', () => {
    const display = resolveCollectibleCatalogDisplay(REAL_M2_WILSON_NFT, t);
    expect(display.hasDigitalTitle).toBe(true);
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

  describe('custody evidence photosJSON fallback', () => {
    const unmappedNft = {
      nftMint: 'mint-evidence',
      hubSlotID: 'slot-evidence',
      hubSlot: {
        hubSlotID: 'slot-evidence',
        certNumber: 'PSA 88888888',
        status: 'in_circulation',
      },
    } as const;

    it('uses the first safe http(s) URL from valid photosJSON', () => {
      const display = resolveCollectibleCatalogDisplay(
        {
          ...unmappedNft,
          hubSlot: {
            ...unmappedNft.hubSlot,
            photosJSON: JSON.stringify([
              'javascript:alert(1)',
              'https://cdn.example.com/cards/front.jpg',
              'https://cdn.example.com/cards/back.jpg',
            ]),
          },
        },
        t
      );

      expect(display.imageUrl).toBe('https://cdn.example.com/cards/front.jpg');
    });

    it('accepts root-relative same-origin paths', () => {
      const display = resolveCollectibleCatalogDisplay(
        {
          ...unmappedNft,
          hubSlot: {
            ...unmappedNft.hubSlot,
            photosJSON: JSON.stringify(['/media/evidence/front.jpg']),
          },
        },
        t
      );

      expect(display.imageUrl).toBe('/media/evidence/front.jpg');
    });

    it('returns undefined for malformed or empty photosJSON', () => {
      expect(
        resolveCollectibleCatalogDisplay(
          { ...unmappedNft, hubSlot: { ...unmappedNft.hubSlot, photosJSON: undefined } },
          t
        ).imageUrl
      ).toBeUndefined();
      expect(
        resolveCollectibleCatalogDisplay(
          { ...unmappedNft, hubSlot: { ...unmappedNft.hubSlot, photosJSON: '' } },
          t
        ).imageUrl
      ).toBeUndefined();
      expect(
        resolveCollectibleCatalogDisplay(
          { ...unmappedNft, hubSlot: { ...unmappedNft.hubSlot, photosJSON: 'not-json' } },
          t
        ).imageUrl
      ).toBeUndefined();
      expect(
        resolveCollectibleCatalogDisplay(
          { ...unmappedNft, hubSlot: { ...unmappedNft.hubSlot, photosJSON: '[]' } },
          t
        ).imageUrl
      ).toBeUndefined();
      expect(
        resolveCollectibleCatalogDisplay(
          {
            ...unmappedNft,
            hubSlot: { ...unmappedNft.hubSlot, photosJSON: JSON.stringify([null, 42, '']) },
          },
          t
        ).imageUrl
      ).toBeUndefined();
    });

    it('rejects unsafe URL schemes, protocol-relative paths, and backslash root paths', () => {
      for (const unsafeUrl of [
        'data:image/png;base64,abc',
        'file:///etc/passwd',
        '//evil.example/photo.jpg',
        'ftp://example.com/photo.jpg',
        '/\\evil.example/photo.jpg',
        '/media\\evil.jpg',
      ]) {
        const display = resolveCollectibleCatalogDisplay(
          {
            ...unmappedNft,
            hubSlot: {
              ...unmappedNft.hubSlot,
              photosJSON: JSON.stringify([unsafeUrl]),
            },
          },
          t
        );

        expect(display.imageUrl).toBeUndefined();
      }
    });

    it('prefers curated demo image over custody evidence photos', () => {
      const display = resolveCollectibleCatalogDisplay(
        {
          ...REAL_M2_WILSON_NFT,
          hubSlot: {
            ...REAL_M2_WILSON_NFT.hubSlot,
            photosJSON: JSON.stringify(['https://cdn.example.com/should-not-win.jpg']),
          },
        },
        t
      );

      expect(display.hasDemoMapping).toBe(true);
      expect(display.imageUrl).toBe(
        '/images/demo-cards/m2-wilson-sports-card-demo-001-psa-10-testnet.jpg'
      );
      expect(display.imageUrl).not.toBe('https://cdn.example.com/should-not-win.jpg');
    });
  });
});

describe('isCollectibleSyntheticCatalogIdentifier', () => {
  it('detects E2E and fixture seed/collateral identifiers', () => {
    expect(isCollectibleSyntheticCatalogIdentifier('E2E-SEED-PSA-1783')).toBe(true);
    expect(isCollectibleSyntheticCatalogIdentifier('e2e_seed_demo')).toBe(true);
    expect(isCollectibleSyntheticCatalogIdentifier('SER-SEED-1783-ABCD')).toBe(true);
    expect(isCollectibleSyntheticCatalogIdentifier('SER-COLLATERAL-FUNDED-1783')).toBe(true);
    expect(isCollectibleSyntheticCatalogIdentifier('SER-COLLATERAL-UNFUNDED-1783')).toBe(true);
    expect(isCollectibleSyntheticCatalogIdentifier('DEFAULT-FIXTURE-001')).toBe(true);
    expect(isCollectibleSyntheticCatalogIdentifier('PSA 12345678')).toBe(false);
    expect(isCollectibleSyntheticCatalogIdentifier('WILSON-001')).toBe(false);
  });
});
