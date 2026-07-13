// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrder } from '../../../services/api/orders';
import {
  getApiMode,
  getApiModeConfig,
  setApiMode,
  setApiModeConfig,
} from '../../../services/api/mode';

vi.mock('../../../services/api/helpers', () => ({
  authPost: vi.fn(),
  authGet: vi.fn(),
  authSafeGet: vi.fn(),
}));

import { authPost } from '../../../services/api/helpers';
import { NODE_API } from '../../../config/apiPaths';

describe('createOrder affiliate referral', () => {
  let previousMode = getApiMode();
  let previousConfig = getApiModeConfig();

  beforeEach(() => {
    previousMode = getApiMode();
    previousConfig = { ...getApiModeConfig() };
    setApiMode('real');
    setApiModeConfig({ mockDelay: 0 });
    vi.clearAllMocks();
  });

  afterEach(() => {
    setApiMode(previousMode);
    setApiModeConfig(previousConfig);
  });

  it('forwards the seller-scoped referral into the signed order request', async () => {
    vi.mocked(authPost).mockResolvedValue({
      orderID: 'order-1',
      paymentAddress: '',
      amount: { amount: '100', currency: { code: 'USD', divisibility: 2 } },
    });

    await createOrder({
      vendorId: 'seller-peer',
      affiliateReferralSessionID: ' referral-session ',
      items: [{ listingHash: 'listing-hash', quantity: 1 }],
      pricingCoin: 'USD',
    });

    expect(authPost).toHaveBeenCalledWith(
      NODE_API.ORDERS,
      expect.objectContaining({ affiliateReferralSessionID: 'referral-session' }),
      { 'X-Store-PeerID': 'seller-peer' }
    );
  });
});
