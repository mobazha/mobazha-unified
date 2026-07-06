// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateSellerDealLink,
  createSellerDealLink,
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
});
