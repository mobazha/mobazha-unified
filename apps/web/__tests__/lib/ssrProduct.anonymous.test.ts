// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ssrSearchCatalog', () => ({
  resolveSsrListingVendorPeer: vi.fn(),
}));

import { resolveSsrListingVendorPeer } from '@/lib/ssrSearchCatalog';
import { fetchSsrProduct } from '@/lib/ssrProduct';

describe('fetchSsrProduct anonymous canonical URLs', () => {
  const slug = 'm2-wilson-mtg-card-demo-003-psa-10-testnet';
  const sellerPeerID = 'QmM2WilsonSeller';

  beforeEach(() => {
    vi.mocked(resolveSsrListingVendorPeer).mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            listing: {
              slug,
              item: { title: 'MTG Demo Card' },
              vendorID: { peerID: sellerPeerID },
            },
          },
        }),
      })
    );
  });

  it('resolves seller peer via search before fetching listing metadata', async () => {
    vi.mocked(resolveSsrListingVendorPeer).mockResolvedValueOnce(sellerPeerID);

    const product = await fetchSsrProduct(slug);

    expect(resolveSsrListingVendorPeer).toHaveBeenCalledWith(slug);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `/v1/listings/${encodeURIComponent(sellerPeerID)}/${encodeURIComponent(slug)}`
      ),
      expect.any(Object)
    );
    expect(product?.vendorID?.peerID).toBe(sellerPeerID);
  });

  it('uses explicit peerID without search lookup', async () => {
    await fetchSsrProduct(slug, sellerPeerID);

    expect(resolveSsrListingVendorPeer).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `/v1/listings/${encodeURIComponent(sellerPeerID)}/${encodeURIComponent(slug)}`
      ),
      expect.any(Object)
    );
  });
});
