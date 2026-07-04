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

import { get, post } from '../../../services/api/client';
import { anonymousGet, anonymousPost } from '../../../services/api/helpers';

describe('anonymous API helpers', () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
    vi.mocked(post).mockReset();
  });

  it('removes credentials while preserving same-origin store routing context', async () => {
    vi.mocked(get).mockResolvedValue({ ok: true });
    vi.mocked(post).mockResolvedValue({ ok: true });

    await anonymousGet('/settings/guest-checkout');
    await anonymousPost('/guest/orders', { paymentCoin: 'BTC' });

    const expectedHeaders = {
      'Content-Type': 'application/json',
      'X-Store-PeerID': 'store-peer',
      'X-Storefront-Slug': 'shop',
    };
    expect(get).toHaveBeenCalledWith('/v1/settings/guest-checkout', expectedHeaders);
    expect(post).toHaveBeenCalledWith('/v1/guest/orders', { paymentCoin: 'BTC' }, expectedHeaders);
  });
});
