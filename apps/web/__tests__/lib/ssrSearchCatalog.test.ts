import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseSearchListingPage, resolveSsrListingVendorPeer } from '@/lib/ssrSearchCatalog';
import { slugToSearchQuery } from '@mobazha/core/utils/productUrl';

describe('parseSearchListingPage', () => {
  it('unwraps data envelope and reads vendor peerID from relationships', () => {
    const { items, hasMore } = parseSearchListingPage({
      data: {
        results: {
          results: [
            {
              data: { slug: 'icon-pack', vendorPeerID: 'QmFallback' },
              relationships: { vendor: { data: { peerID: 'QmVendor' } } },
            },
          ],
          morePages: true,
        },
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0].data?.slug).toBe('icon-pack');
    expect(items[0].relationships?.vendor?.data?.peerID).toBe('QmVendor');
    expect(hasMore).toBe(true);
  });

  it('accepts a bare results payload', () => {
    const { items, hasMore } = parseSearchListingPage({
      results: {
        results: [{ data: { slug: 'wireless-headphones' } }],
        morePages: false,
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0].data?.slug).toBe('wireless-headphones');
    expect(hasMore).toBe(false);
  });

  it('reads list envelope meta.hasMore from /search/v1/listings', () => {
    const { items, hasMore } = parseSearchListingPage({
      data: [{ data: { slug: 'poster-a' } }, { data: { slug: 'poster-b' } }],
      meta: { total: 116, hasMore: true },
    });

    expect(items).toHaveLength(2);
    expect(hasMore).toBe(true);
  });
});

describe('resolveSsrListingVendorPeer', () => {
  const slug = 'm2-wilson-mtg-card-demo-003-psa-10-testnet';
  const searchQuery = slugToSearchQuery(slug);
  const sellerPeerID = 'QmM2WilsonSeller';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  function searchCallQuery(): string | null {
    const callUrl = vi.mocked(fetch).mock.calls.at(-1)?.[0];
    if (!callUrl || typeof callUrl !== 'string') return null;
    return new URL(callUrl, 'http://localhost').searchParams.get('q');
  }

  it('queries search with normalized slug tokens and exact-matches slug before returning peerID', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            data: { slug, vendorPeerID: sellerPeerID },
            relationships: { vendor: { data: { peerID: sellerPeerID } } },
          },
        ],
        meta: { hasMore: false },
      }),
    } as Response);

    await expect(resolveSsrListingVendorPeer(slug)).resolves.toBe(sellerPeerID);
    expect(searchCallQuery()).toBe(searchQuery);
    expect(searchCallQuery()).not.toBe(slug);
  });

  it('ignores search hits whose slug does not exactly match the requested slug', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            data: {
              slug: 'm2-wilson-mtg-card-demo-004-psa-10-testnet',
              vendorPeerID: 'QmOtherSeller',
            },
          },
        ],
        meta: { hasMore: false },
      }),
    } as Response);

    await expect(resolveSsrListingVendorPeer(slug)).resolves.toBeUndefined();
    expect(searchCallQuery()).toBe(searchQuery);
  });
});
