import { describe, expect, it } from 'vitest';
import type { ProductListItem } from '../../types/product';
import {
  excludeListingBySlug,
  filterListingsByScopeTag,
  filterStoreOwnedListings,
  resolveRelatedListingsScopeTag,
} from '../../utils/storeRelatedListings';

function listing(slug: string, vendorPeerID = '', title = slug, tags?: string[]): ProductListItem {
  return {
    slug,
    title,
    thumbnail: {},
    price: { amount: 100, currency: { code: 'USD', divisibility: 2 } },
    vendorPeerID,
    ...(tags ? { tags } : {}),
  };
}

describe('filterStoreOwnedListings', () => {
  const storePeerID = 'QmWilsonSeller';

  it('drops ownerless listings (no vendorPeerID to verify store ownership)', () => {
    expect(filterStoreOwnedListings([listing('card-a')], storePeerID)).toEqual([]);
    expect(
      filterStoreOwnedListings(
        [
          listing('premium-ui-kit', '', 'Premium UI Kit'),
          listing('python-course', '', 'Python course'),
        ],
        storePeerID
      )
    ).toEqual([]);
  });

  it('keeps listings that match the store peer ID', () => {
    expect(filterStoreOwnedListings([listing('card-b', storePeerID)], storePeerID)).toHaveLength(1);
  });

  it('drops listings from other vendors (mock/platform catalog bleed)', () => {
    const mixed = [
      listing('premium-ui-kit', 'QmDemoVendor1', 'Premium UI Kit'),
      listing('python-course', 'QmDemoVendor2', 'Python course'),
      listing('wilson-card', storePeerID, 'PSA 10 Wilson'),
    ];
    expect(filterStoreOwnedListings(mixed, storePeerID)).toEqual([
      listing('wilson-card', storePeerID, 'PSA 10 Wilson'),
    ]);
  });

  it('returns empty when store peer ID is blank', () => {
    expect(filterStoreOwnedListings([listing('card-a', storePeerID)], '  ')).toEqual([]);
  });
});

describe('excludeListingBySlug', () => {
  it('removes the current product slug', () => {
    const items = [listing('current'), listing('other', 'QmStore')];
    expect(excludeListingBySlug(items, 'current')).toEqual([listing('other', 'QmStore')]);
  });

  it('returns all listings when slug is omitted', () => {
    const items = [listing('a'), listing('b')];
    expect(excludeListingBySlug(items)).toEqual(items);
  });
});

describe('resolveRelatedListingsScopeTag', () => {
  it('returns m{N}-{slug} curation tags from product tags', () => {
    expect(resolveRelatedListingsScopeTag(['m2-wilson', 'graded-card', 'testnet', 'sports'])).toBe(
      'm2-wilson'
    );
  });

  it('returns undefined when no curation scope tag is present', () => {
    expect(resolveRelatedListingsScopeTag(['graded-card', 'sports'])).toBeUndefined();
    expect(resolveRelatedListingsScopeTag()).toBeUndefined();
  });
});

describe('filterListingsByScopeTag', () => {
  const storePeerID = 'QmWilsonSeller';

  it('passes through all listings when scopeTag is omitted', () => {
    const items = [
      listing('wilson-card', storePeerID, 'Wilson card', ['m2-wilson']),
      listing('premium-ui-kit', storePeerID, 'Premium UI Kit'),
    ];
    expect(filterListingsByScopeTag(items)).toEqual(items);
  });

  it('keeps only same-tag listings for curated cohort scope', () => {
    const items = [
      listing('wilson-card', storePeerID, 'Wilson card', ['m2-wilson', 'sports']),
      listing('premium-ui-kit', storePeerID, 'Premium UI Kit', ['digital']),
    ];
    expect(filterListingsByScopeTag(items, 'm2-wilson')).toEqual([
      listing('wilson-card', storePeerID, 'Wilson card', ['m2-wilson', 'sports']),
    ]);
  });

  it('drops tagless listings when scopeTag is required', () => {
    expect(
      filterListingsByScopeTag(
        [listing('premium-ui-kit', storePeerID, 'Premium UI Kit')],
        'm2-wilson'
      )
    ).toEqual([]);
  });

  it('matches scope tags case-insensitively', () => {
    expect(
      filterListingsByScopeTag(
        [listing('wilson-card', storePeerID, 'Wilson card', ['M2-Wilson'])],
        'm2-wilson'
      )
    ).toHaveLength(1);
  });
});
