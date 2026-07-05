// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrderPaymentSelectionQuote } from '../../../services/api/orders';
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

describe('createOrderPaymentSelectionQuote', () => {
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

  it('posts canonical paymentCoin to payment-selection-quotes', async () => {
    vi.mocked(authPost).mockResolvedValue({
      id: 'psq-1',
      orderID: 'order-1',
      feeQuoteID: 'fee-1',
      dealLinkID: 'deal-1',
      dealRevision: 1,
      termsHash: 'hash',
      schemaVersion: 1,
      policyVersion: '1',
      pricingCurrency: 'USD',
      pricingAmount: '4999',
      pricingDivisibility: 2,
      paymentCoin: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
      paymentCurrency: 'BTC',
      paymentDivisibility: 8,
      conversionRequired: true,
      exchangeRate: '250000',
      exchangeRateBase: 'BTC',
      exchangeRateQuote: 'USD',
      exchangeRateQuoteDivisibility: 2,
      paymentSubtotal: '250000',
      providerOrNetworkCost: '0',
      platformPaymentCost: '0',
      buyerPaymentTotal: '250000',
      expiresAt: '2099-01-01T00:00:00Z',
      createdAt: '2026-07-05T00:00:00Z',
    });

    const quote = await createOrderPaymentSelectionQuote({
      orderId: 'order-1',
      paymentCoin: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
      vendorPeerID: 'QmVendor',
    });

    expect(authPost).toHaveBeenCalledWith(
      NODE_API.ORDER_PAYMENT_SELECTION_QUOTES('order-1'),
      { paymentCoin: expect.any(String) },
      { 'X-Store-PeerID': 'QmVendor' }
    );
    expect(quote.id).toBe('psq-1');
    expect(quote.buyerPaymentTotal).toBe('250000');
  });
});
