import { describe, expect, it } from 'vitest';
import {
  computeFeaturedStoreScore,
  countUniqueVendors,
  diversifyListingsByVendor,
  homepageFeedFetchLimit,
  isNewOnNetworkStore,
  shouldDiversifyBrowseAllSearch,
} from '../../utils/homepageFeeds';
import type { SearchedUser } from '../../services/api/products';

describe('diversifyListingsByVendor', () => {
  const items = [
    { slug: 'a1', vendorPeerID: 'vendor-a' },
    { slug: 'a2', vendorPeerID: 'vendor-a' },
    { slug: 'a3', vendorPeerID: 'vendor-a' },
    { slug: 'b1', vendorPeerID: 'vendor-b' },
    { slug: 'b2', vendorPeerID: 'vendor-b' },
    { slug: 'c1', vendorPeerID: 'vendor-c' },
  ];

  it('caps items per vendor and round-robins across vendors', () => {
    const result = diversifyListingsByVendor(items, { limit: 4, maxPerVendor: 2 });
    expect(result.map(i => i.slug)).toEqual(['a1', 'b1', 'c1', 'a2']);
  });

  it('returns fewer items when not enough diverse vendors', () => {
    const mono = [
      { slug: 'a1', vendorPeerID: 'same' },
      { slug: 'a2', vendorPeerID: 'same' },
      { slug: 'a3', vendorPeerID: 'same' },
    ];
    const result = diversifyListingsByVendor(mono, { limit: 8, maxPerVendor: 2 });
    expect(result).toHaveLength(2);
  });
});

describe('homepageFeedFetchLimit', () => {
  it('returns at least 32 and scales with display limit', () => {
    expect(homepageFeedFetchLimit(8)).toBe(32);
    expect(homepageFeedFetchLimit(12)).toBe(48);
  });

  it('caps at 150 for bulk-import windows', () => {
    expect(homepageFeedFetchLimit(40)).toBe(150);
  });
});

describe('countUniqueVendors', () => {
  it('counts distinct vendorPeerID values', () => {
    expect(
      countUniqueVendors([{ vendorPeerID: 'a' }, { vendorPeerID: 'a' }, { vendorPeerID: 'b' }])
    ).toBe(2);
  });
});

describe('computeFeaturedStoreScore', () => {
  it('prefers branded stores over bulk listing count', () => {
    const bulkImport: SearchedUser = {
      peerID: 'bulk',
      name: 'Bulk',
      listingCount: 500,
      rating: 0,
      reviewCount: 0,
    };
    const curated: SearchedUser = {
      peerID: 'curated',
      name: 'Curated',
      avatar: 'https://example.com/a.png',
      headerImage: 'https://example.com/h.png',
      shortDescription: 'Hand-picked goods',
      listingCount: 8,
      rating: 4.5,
      reviewCount: 12,
    };
    expect(computeFeaturedStoreScore(curated)).toBeGreaterThan(
      computeFeaturedStoreScore(bulkImport)
    );
  });
});

describe('isNewOnNetworkStore', () => {
  it('detects catalog-heavy stores without reviews', () => {
    expect(
      isNewOnNetworkStore({
        peerID: 'x',
        name: 'New',
        listingCount: 10,
        reviewCount: 0,
        rating: 0,
      })
    ).toBe(true);
    expect(
      isNewOnNetworkStore({
        peerID: 'y',
        name: 'Established',
        listingCount: 10,
        reviewCount: 3,
        rating: 4,
      })
    ).toBe(false);
  });
});

describe('shouldDiversifyBrowseAllSearch', () => {
  it('applies to browse-all first page with sort modes that flood under bulk import', () => {
    expect(shouldDiversifyBrowseAllSearch({ query: '*', page: 0, sortBy: 'newest' })).toBe(true);
    expect(shouldDiversifyBrowseAllSearch({ query: '*', page: 0, sortBy: 'rating' })).toBe(true);
    expect(shouldDiversifyBrowseAllSearch({ query: 'shoes', page: 0, sortBy: 'newest' })).toBe(
      false
    );
    expect(shouldDiversifyBrowseAllSearch({ query: '*', page: 1, sortBy: 'newest' })).toBe(false);
  });
});
