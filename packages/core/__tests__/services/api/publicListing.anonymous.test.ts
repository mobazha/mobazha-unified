import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../../../types/product';

vi.mock('../../../services/api/helpers', () => ({
  publicGet: vi.fn(),
  publicSafeGet: vi.fn(),
  publicPost: vi.fn(),
  searchSafeGet: vi.fn(),
  searchRawGet: vi.fn(),
  searchPost: vi.fn(),
}));

vi.mock('../../../services/api/storeStatusCache', () => ({
  isStoreKnownOffline: vi.fn(() => false),
  markStoreOffline: vi.fn(),
  markStoreOnline: vi.fn(),
}));

import { publicGet, searchRawGet } from '../../../services/api/helpers';
import {
  getPublicListing,
  resolveListingVendorPeerFromSearch,
} from '../../../services/api/products';
import { slugToSearchQuery } from '../../../utils/productUrl';

const sellerPeerID = 'QmM2WilsonSeller';
const slug = 'm2-wilson-mtg-card-demo-003-psa-10-testnet';
const searchQuery = slugToSearchQuery(slug);

function searchCallQuery(): string | null {
  const callUrl = vi.mocked(searchRawGet).mock.calls.at(-1)?.[0];
  if (!callUrl || typeof callUrl !== 'string') return null;
  return new URL(callUrl, 'http://localhost').searchParams.get('q');
}

function mockListing(): Product {
  return {
    slug,
    vendorID: { peerID: sellerPeerID, name: 'Wilson Cards' },
    metadata: {
      version: 0,
      contractType: 'PHYSICAL_GOOD',
      format: 'FIXED_PRICE',
      expiry: '',
      acceptedCurrencies: [],
      pricingCurrency: { code: 'USD', divisibility: 2 },
      escrowTimeoutHours: 0,
    },
    item: {
      title: 'MTG Demo Card',
      description: '',
      processingTime: '',
      price: 1200,
      nsfw: false,
      tags: [],
      images: [{ small: 'img-hash', medium: 'img-hash', tiny: '', large: '', original: '' }],
    },
  };
}

describe('getPublicListing anonymous canonical URLs', () => {
  beforeEach(() => {
    vi.mocked(publicGet).mockReset();
    vi.mocked(searchRawGet).mockReset();
  });

  it('resolveListingVendorPeerFromSearch queries search with normalized slug tokens', async () => {
    vi.mocked(searchRawGet).mockResolvedValueOnce({
      data: [
        {
          data: {
            slug,
            title: 'MTG Demo Card',
            vendorPeerID: sellerPeerID,
            thumbnail: {},
            price: { amount: 1200, currency: { code: 'USD', divisibility: 2 } },
          },
        },
      ],
      meta: { total: 1, hasMore: false },
    });

    await expect(resolveListingVendorPeerFromSearch(slug)).resolves.toBe(sellerPeerID);
    expect(searchCallQuery()).toBe(searchQuery);
    expect(searchCallQuery()).not.toBe(slug);
  });

  it('resolveListingVendorPeerFromSearch ignores search hits with a different slug', async () => {
    vi.mocked(searchRawGet).mockResolvedValueOnce({
      data: [
        {
          data: {
            slug: 'm2-wilson-mtg-card-demo-004-psa-10-testnet',
            title: 'Other Card',
            vendorPeerID: 'QmOtherSeller',
            thumbnail: {},
            price: { amount: 1200, currency: { code: 'USD', divisibility: 2 } },
          },
        },
      ],
      meta: { total: 1, hasMore: false },
    });

    await expect(resolveListingVendorPeerFromSearch(slug)).resolves.toBeUndefined();
    expect(searchCallQuery()).toBe(searchQuery);
  });

  it('resolves peerID from search and fetches /listings/{peerID}/{slug} when peerID is omitted', async () => {
    vi.mocked(searchRawGet).mockResolvedValueOnce({
      data: [
        {
          data: {
            slug,
            title: 'MTG Demo Card',
            vendorPeerID: sellerPeerID,
            thumbnail: {},
            price: { amount: 1200, currency: { code: 'USD', divisibility: 2 } },
          },
        },
      ],
      meta: { total: 1, hasMore: false },
    });
    vi.mocked(publicGet).mockResolvedValueOnce({ listing: mockListing() });

    const result = await getPublicListing(slug);

    expect(searchCallQuery()).toBe(searchQuery);
    expect(publicGet).toHaveBeenCalledWith(`/listings/${sellerPeerID}/${slug}?usecache=true`);
    expect(publicGet).not.toHaveBeenCalledWith(`/listings/${slug}`);
    expect(result.listing?.vendorID?.peerID).toBe(sellerPeerID);
    expect(result.isOffline).toBe(false);
  });

  it('keeps explicit peerID behavior without search lookup', async () => {
    vi.mocked(publicGet).mockResolvedValueOnce({ listing: mockListing() });

    const result = await getPublicListing(slug, sellerPeerID);

    expect(searchRawGet).not.toHaveBeenCalled();
    expect(publicGet).toHaveBeenCalledWith(`/listings/${sellerPeerID}/${slug}?usecache=true`);
    expect(result.listing?.slug).toBe(slug);
  });
});
