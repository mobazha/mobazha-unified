import { describe, expect, it } from 'vitest';
import { derivePublicMarketplaceCurationRefs } from '../../utils/communityMarketplace';
import type { PublicNativeMarketplaceDetail } from '../../types/marketplace';

function buildDetail(
  overrides: Partial<PublicNativeMarketplaceDetail> = {}
): PublicNativeMarketplaceDetail {
  return {
    marketplace: {
      id: 'mp-1',
      name: 'Test',
      slug: 'test',
      publicURL: 'https://example.test',
      buyerAccessMode: 'open',
      sellerReviewMode: 'manual',
      catalogMode: 'curated',
      discoverability: 'public',
      sellerEntryMode: 'operator_invited',
      vertical: 'general',
      sellerCount: 1,
      productCount: 2,
    },
    sellers: [{ peerID: 'QmSellerA', productGroups: [], sortOrder: 9 }],
    featured: [],
    banners: [],
    listings: {
      listings: [
        { peerID: 'QmSellerA', slug: 'alpha' },
        { peerID: 'QmSellerB', slug: 'beta' },
      ],
      total: 2,
      page: 1,
      pageSize: 24,
      totalPage: 1,
    },
    ...overrides,
  };
}

describe('derivePublicMarketplaceCurationRefs', () => {
  it('preserves operator order from featured and banner sortOrder', () => {
    const refs = derivePublicMarketplaceCurationRefs(
      buildDetail({
        featured: [
          { type: 'listing', peerID: 'QmSeller2', slug: 'zeta', sortOrder: 20 },
          { type: 'seller', peerID: 'QmSeller2', sortOrder: 30 },
          { type: 'listing', peerID: 'QmSeller1', slug: 'alpha', sortOrder: 10 },
          { type: 'seller', peerID: 'QmSeller1', sortOrder: 5 },
        ],
        banners: [
          { peerID: 'QmSeller3', slug: 'banner-2', sortOrder: 2 },
          { peerID: 'QmSeller2', slug: 'banner-1', sortOrder: 1 },
        ],
      })
    );

    expect(refs.curatedListingRefs).toEqual([
      { peerID: 'QmSeller1', slug: 'alpha' },
      { peerID: 'QmSeller2', slug: 'zeta' },
    ]);
    expect(refs.curatedSellerPeerIDs).toEqual(['QmSeller1', 'QmSeller2']);
    expect(refs.bannerListingRefs).toEqual([
      { peerID: 'QmSeller2', slug: 'banner-1' },
      { peerID: 'QmSeller3', slug: 'banner-2' },
    ]);
  });

  it('keeps fallback discovery refs when curated targets are missing', () => {
    const refs = derivePublicMarketplaceCurationRefs(
      buildDetail({
        featured: [{ type: 'listing', sortOrder: 0 }],
      })
    );

    expect(refs.curatedListingRefs).toEqual([]);
    expect(refs.curatedSellerPeerIDs).toEqual([]);
    expect(refs.fallbackListingRefs).toEqual([
      { peerID: 'QmSellerA', slug: 'alpha' },
      { peerID: 'QmSellerB', slug: 'beta' },
    ]);
    expect(refs.fallbackSellerPeerIDs).toEqual(['QmSellerA']);
  });
});
