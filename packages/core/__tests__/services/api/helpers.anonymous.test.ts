// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  request: vi.fn(),
  safeRequest: vi.fn(),
}));

vi.mock('../../../services/api/config', () => ({
  getMyGatewayUrl: vi.fn(() => '/buyer-api/v1'),
  getGatewayUrl: vi.fn(() => '/v1'),
  getBuyerGatewayUrl: vi.fn(() => '/buyer-api/v1'),
  getSearchUrl: vi.fn(() => '/info'),
  getHostingUrl: vi.fn(() => ''),
  getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer secret' })),
  getHeadersWithContext: vi.fn(() => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer secret',
    'X-Store-PeerID': 'store-peer',
    'X-Storefront-Slug': 'shop',
  })),
}));

import { request } from '../../../services/api/client';
import {
  anonymousGet,
  anonymousPost,
  crossStoreAnonymousGet,
  crossStoreAnonymousPost,
} from '../../../services/api/helpers';

describe('anonymous API helpers', () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
  });

  it('removes credentials while preserving same-origin store routing context', async () => {
    vi.mocked(request).mockResolvedValue({ ok: true });

    await anonymousGet('/settings/guest-checkout');
    await anonymousPost('/guest/orders', { paymentCoin: 'BTC' });

    const expectedHeaders = {
      'Content-Type': 'application/json',
      'X-Store-PeerID': 'store-peer',
      'X-Storefront-Slug': 'shop',
    };
    expect(request).toHaveBeenCalledWith('/v1/settings/guest-checkout', {
      method: 'GET',
      headers: expectedHeaders,
      skipUnauthorizedHandler: true,
    });
    expect(request).toHaveBeenCalledWith('/v1/guest/orders', {
      method: 'POST',
      body: { paymentCoin: 'BTC' },
      headers: expectedHeaders,
      skipUnauthorizedHandler: true,
    });
  });

  it('forwards cancellation without reintroducing credentials', async () => {
    vi.mocked(request).mockResolvedValue({ ok: true });
    const controller = new AbortController();

    await anonymousGet('/settings/guest-checkout', { signal: controller.signal });
    await anonymousPost('/guest/orders', { paymentCoin: 'BTC' }, { signal: controller.signal });

    expect(request).toHaveBeenCalledWith('/v1/settings/guest-checkout', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Store-PeerID': 'store-peer',
        'X-Storefront-Slug': 'shop',
      },
      signal: controller.signal,
      skipUnauthorizedHandler: true,
    });
    expect(request).toHaveBeenCalledWith('/v1/guest/orders', {
      method: 'POST',
      body: { paymentCoin: 'BTC' },
      headers: {
        'Content-Type': 'application/json',
        'X-Store-PeerID': 'store-peer',
        'X-Storefront-Slug': 'shop',
      },
      signal: controller.signal,
      skipUnauthorizedHandler: true,
    });
  });

  it('routes selected-store public contracts through the buyer gateway with Peer metadata only', async () => {
    vi.mocked(request).mockResolvedValue({ ok: true });

    await crossStoreAnonymousGet('/public/seller-affiliate/program', ' seller-peer ');
    await crossStoreAnonymousPost(
      '/public/seller-affiliate/programs/program-1/links',
      ' seller-peer ',
      { evidence: { signature: 'signed' } }
    );

    expect(request).toHaveBeenCalledWith('/buyer-api/v1/public/seller-affiliate/program', {
      method: 'GET',
      headers: { 'X-Store-PeerID': 'seller-peer' },
      skipUnauthorizedHandler: true,
    });
    expect(request).toHaveBeenCalledWith(
      '/buyer-api/v1/public/seller-affiliate/programs/program-1/links',
      {
        method: 'POST',
        body: { evidence: { signature: 'signed' } },
        headers: { 'X-Store-PeerID': 'seller-peer' },
        skipUnauthorizedHandler: true,
      }
    );
  });

  it('fails closed instead of falling back to the local Node when the target Peer is blank', async () => {
    await expect(crossStoreAnonymousGet('/public/seller-affiliate/program', '   ')).rejects.toThrow(
      'seller Peer ID is required'
    );
    await expect(
      crossStoreAnonymousPost('/public/seller-affiliate/programs/program-1/links', '')
    ).rejects.toThrow('seller Peer ID is required');
    expect(request).not.toHaveBeenCalled();
  });
});
