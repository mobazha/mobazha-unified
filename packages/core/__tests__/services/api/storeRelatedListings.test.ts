// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductListItem } from '../../../types/product';

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

import { publicGet, publicSafeGet, searchSafeGet } from '../../../services/api/helpers';
import { getStoreRelatedListings } from '../../../services/api/products';

function listing(
  slug: string,
  vendorPeerID: string,
  title = slug,
  tags?: string[]
): ProductListItem {
  return {
    slug,
    title,
    thumbnail: {},
    price: { amount: 100, currency: { code: 'USD', divisibility: 2 } },
    vendorPeerID,
    ...(tags ? { tags } : {}),
  };
}

describe('getStoreRelatedListings', () => {
  const storePeerID = 'QmWilsonSeller';

  beforeEach(() => {
    vi.mocked(publicSafeGet).mockReset();
    vi.mocked(publicGet).mockReset();
    vi.mocked(searchSafeGet).mockReset();
    vi.mocked(publicGet).mockRejectedValue(new Error('store offline'));
    vi.mocked(searchSafeGet).mockResolvedValue([]);
  });

  it('returns only same-store listings and excludes the current slug', async () => {
    vi.mocked(publicSafeGet).mockResolvedValueOnce([
      listing('wilson-a', storePeerID),
      listing('wilson-b', storePeerID),
      listing('premium-ui-kit', 'QmDemoVendor', 'Premium UI Kit'),
    ]);

    const result = await getStoreRelatedListings(storePeerID, {
      excludeSlug: 'wilson-a',
      limit: 6,
    });

    expect(result).toEqual([listing('wilson-b', storePeerID)]);
    expect(publicSafeGet).toHaveBeenCalledTimes(1);
    expect(publicGet).not.toHaveBeenCalled();
  });

  it('returns empty when node index has no suitable same-store listings', async () => {
    vi.mocked(publicSafeGet).mockResolvedValueOnce([
      listing('premium-ui-kit', 'QmDemoVendor', 'Premium UI Kit'),
      listing('python-course', 'QmOtherDemo', 'Python course'),
    ]);

    const result = await getStoreRelatedListings(storePeerID, { limit: 6 });

    expect(result).toEqual([]);
  });

  it('drops ownerless node index rows and falls back to strict search', async () => {
    vi.mocked(publicSafeGet).mockResolvedValueOnce([
      listing('premium-ui-kit', '', 'Premium UI Kit'),
      listing('python-course', '', 'Python course'),
    ]);
    vi.mocked(searchSafeGet).mockResolvedValueOnce([
      {
        slug: 'wilson-b',
        title: 'Wilson card',
        vendorPeerID: storePeerID,
      },
    ]);

    const result = await getStoreRelatedListings(storePeerID, { limit: 6 });

    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('wilson-b');
    expect(result[0].vendorPeerID).toBe(storePeerID);
    expect(searchSafeGet).toHaveBeenCalledTimes(1);
  });

  it('returns empty when node index only has ownerless demo catalog rows', async () => {
    vi.mocked(publicSafeGet).mockResolvedValueOnce([
      listing('premium-ui-kit', '', 'Premium UI Kit'),
      listing('python-course', '', 'Python course'),
    ]);

    const result = await getStoreRelatedListings(storePeerID, { limit: 6 });

    expect(result).toEqual([]);
    expect(searchSafeGet).toHaveBeenCalledTimes(1);
  });

  it('returns empty when node index and strict search fallback have no same-store listings', async () => {
    vi.mocked(publicSafeGet).mockResolvedValueOnce([]);
    vi.mocked(searchSafeGet).mockResolvedValueOnce([
      {
        slug: 'premium-ui-kit',
        title: 'Premium UI Kit',
        vendorPeerID: 'QmDemoVendor',
      },
      {
        slug: 'python-course',
        title: 'Python course',
        peerID: 'QmOtherDemo',
      },
    ]);

    const result = await getStoreRelatedListings(storePeerID, { limit: 4 });

    expect(result).toEqual([]);
    expect(searchSafeGet).toHaveBeenCalledTimes(1);
  });

  it('scopes curated cohort listings by tag and hides unrelated same-store demos', async () => {
    const sameStoreMixed = [
      listing('wilson-card', storePeerID, 'PSA Wilson', ['m2-wilson', 'sports']),
      listing('wilson-card-b', storePeerID, 'Wilson B', ['m2-wilson', 'graded-card']),
      listing('premium-ui-kit', storePeerID, 'Premium UI Kit'),
    ];
    vi.mocked(publicSafeGet).mockResolvedValue(sameStoreMixed);

    const withoutScope = await getStoreRelatedListings(storePeerID, {
      excludeSlug: 'wilson-card',
      limit: 6,
    });
    expect(withoutScope).toEqual([
      listing('wilson-card-b', storePeerID, 'Wilson B', ['m2-wilson', 'graded-card']),
      listing('premium-ui-kit', storePeerID, 'Premium UI Kit'),
    ]);

    const withScope = await getStoreRelatedListings(storePeerID, {
      excludeSlug: 'wilson-card',
      limit: 6,
      scopeTag: 'm2-wilson',
    });
    expect(withScope).toEqual([
      listing('wilson-card-b', storePeerID, 'Wilson B', ['m2-wilson', 'graded-card']),
    ]);
    expect(publicSafeGet).toHaveBeenCalledTimes(2);
  });

  it('preserves search tags when applying curated scope on fallback rows', async () => {
    vi.mocked(publicSafeGet).mockResolvedValueOnce([]);
    vi.mocked(searchSafeGet).mockResolvedValueOnce([
      {
        slug: 'wilson-b',
        title: 'Wilson card B',
        vendorPeerID: storePeerID,
        tags: ['m2-wilson', 'graded-card'],
      },
      {
        slug: 'premium-ui-kit',
        title: 'Premium UI Kit',
        vendorPeerID: storePeerID,
        tags: ['digital'],
      },
    ]);

    const result = await getStoreRelatedListings(storePeerID, {
      excludeSlug: 'wilson-a',
      limit: 6,
      scopeTag: 'm2-wilson',
    });

    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('wilson-b');
    expect(result[0].vendorPeerID).toBe(storePeerID);
    expect(result[0].tags).toEqual(['m2-wilson', 'graded-card']);
  });
});
