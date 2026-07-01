import { describe, expect, it } from 'vitest';

import { parseSearchListingPage } from '@/lib/ssrSearchCatalog';

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
