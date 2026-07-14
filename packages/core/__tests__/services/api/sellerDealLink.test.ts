// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateSellerDealLink,
  closeSellerDealLink,
  createSellerDealLink,
  listSellerDealLinkOrders,
  listSellerDealLinks,
} from '../../../services/api/sellerDealLink';

vi.mock('../../../services/api/helpers', () => ({
  hostingGet: vi.fn(),
  hostingPost: vi.fn(),
}));

import { hostingGet, hostingPost } from '../../../services/api/helpers';

const rawDealLink = {
  id: 'deal-1',
  publicToken: 'public-token',
  publicPath: '/platform/v1/public/deal-links/public-token',
  sellerPeerID: 'seller-peer',
  status: 'active',
  currentRevision: 1,
  title: 'Design review',
  deliveryType: 'fixed_service',
  priceAmount: '125',
  priceCurrency: 'USD',
  terms: { acceptanceHours: 168 },
  termsHash: 'terms-hash',
  createdAt: '2026-07-06T00:00:00Z',
  updatedAt: '2026-07-06T00:00:00Z',
};

describe('seller Deal Link API service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists seller-owned Deal Links', async () => {
    vi.mocked(hostingGet).mockResolvedValue({ data: [rawDealLink] });

    const links = await listSellerDealLinks();

    expect(hostingGet).toHaveBeenCalledWith('/platform/v1/deal-links');
    expect(links[0]?.publicToken).toBe('public-token');
  });

  it('creates a draft from the exact listing snapshot and activates it', async () => {
    const request = {
      title: 'Design review',
      deliveryType: 'fixed_service',
      priceAmount: '125',
      priceCurrency: 'USD',
      terms: { acceptanceHours: 168, deliverables: ['Review report'] },
      purchaseTemplate: {
        listingHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        quantity: '1',
        options: [],
        optionalFeatures: [],
      },
    };
    vi.mocked(hostingPost)
      .mockResolvedValueOnce({ data: { ...rawDealLink, status: 'draft' } })
      .mockResolvedValueOnce({ data: rawDealLink });

    const draft = await createSellerDealLink(request);
    const active = await activateSellerDealLink(draft.id);

    expect(hostingPost).toHaveBeenNthCalledWith(1, '/platform/v1/deal-links', request);
    expect(hostingPost).toHaveBeenNthCalledWith(
      2,
      '/platform/v1/deal-links/deal-1/activate',
      undefined
    );
    expect(active.status).toBe('active');
  });

  it('lists the orders placed through a Deal Link, reading the acceptanceStatus field', async () => {
    vi.mocked(hostingGet).mockResolvedValue({
      data: {
        items: [
          {
            orderID: 'order-1',
            acceptanceStatus: 'completed',
            buyerPeerID: 'buyer-peer',
            pricingCoin: 'USD',
            amount: '12500',
            currencyDivisibility: 2,
            createdAt: '2026-07-10T00:00:00Z',
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      },
    });

    const page = await listSellerDealLinkOrders('deal-1');

    expect(hostingGet).toHaveBeenCalledWith('/platform/v1/deal-links/deal-1/orders');
    expect(page.total).toBe(1);
    expect(page.items[0]?.orderID).toBe('order-1');
    // Renamed from `status`: this reflects whether the Node order was created,
    // not whether it was paid, shipped, or fulfilled — see sellerDealLink.ts.
    expect(page.items[0]?.acceptanceStatus).toBe('completed');
    expect(page.items[0]?.currencyDivisibility).toBe(2);
  });

  it('preserves the authoritative divisibility across precisions, including 0', async () => {
    vi.mocked(hostingGet).mockResolvedValue({
      data: {
        items: [
          {
            orderID: 'order-6',
            currencyDivisibility: 6,
            buyerPeerID: 'b',
            createdAt: '2026-07-10T00:00:00Z',
          },
          {
            orderID: 'order-18',
            currencyDivisibility: 18,
            buyerPeerID: 'b',
            createdAt: '2026-07-10T00:00:00Z',
          },
          {
            orderID: 'order-0',
            currencyDivisibility: 0,
            buyerPeerID: 'b',
            createdAt: '2026-07-10T00:00:00Z',
          },
          { orderID: 'order-absent', buyerPeerID: 'b', createdAt: '2026-07-10T00:00:00Z' },
        ],
        total: 4,
        limit: 50,
        offset: 0,
      },
    });

    const page = await listSellerDealLinkOrders('deal-1');

    expect(page.items[0]?.currencyDivisibility).toBe(6);
    expect(page.items[1]?.currencyDivisibility).toBe(18);
    // A whole-unit coin's 0 must survive (not be collapsed into undefined),
    // otherwise the amount would fall back to a currency-registry guess.
    expect(page.items[2]?.currencyDivisibility).toBe(0);
    // A missing field is genuinely absent, distinct from an authoritative 0.
    expect(page.items[3]?.currencyDivisibility).toBeUndefined();
  });

  it('falls back to a legacy `status` field for orders normalized before the rename', async () => {
    vi.mocked(hostingGet).mockResolvedValue({
      data: {
        items: [
          {
            orderID: 'order-legacy',
            status: 'processing',
            buyerPeerID: 'buyer-peer',
            createdAt: '2026-07-10T00:00:00Z',
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      },
    });

    const page = await listSellerDealLinkOrders('deal-1');

    expect(page.items[0]?.acceptanceStatus).toBe('processing');
  });

  it('forwards pagination params when listing Deal Link orders', async () => {
    vi.mocked(hostingGet).mockResolvedValue({
      data: { items: [], total: 0, limit: 10, offset: 20 },
    });

    await listSellerDealLinkOrders('deal-1', { limit: 10, offset: 20 });

    expect(hostingGet).toHaveBeenCalledWith(
      '/platform/v1/deal-links/deal-1/orders?limit=10&offset=20'
    );
  });

  it('closes a Deal Link into its terminal state', async () => {
    vi.mocked(hostingPost).mockResolvedValue({ data: { ...rawDealLink, status: 'closed' } });

    const closed = await closeSellerDealLink('deal-1');

    expect(hostingPost).toHaveBeenCalledWith('/platform/v1/deal-links/deal-1/close', undefined);
    expect(closed.status).toBe('closed');
  });
});
