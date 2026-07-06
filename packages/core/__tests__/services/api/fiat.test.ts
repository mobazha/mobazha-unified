// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/api/helpers', () => ({
  authPost: vi.fn(),
}));

import { NODE_API } from '../../../config/apiPaths';
import { capturePayment } from '../../../services/api/fiat';
import { authPost } from '../../../services/api/helpers';

describe('fiat capture routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authPost).mockResolvedValue({
      paymentID: 'payment-1',
      status: 'succeeded',
      amount: 100,
      currency: 'USD',
      paymentMethod: { type: 'paypal', brand: 'paypal', last4: '' },
    });
  });

  it('keeps Deal capture on the authenticated buyer runtime', async () => {
    await capturePayment(undefined, 'paypal', 'session-1');

    expect(authPost).toHaveBeenCalledWith(
      NODE_API.FIAT_CAPTURE_PAYMENT(undefined, 'paypal', 'session-1')
    );
    expect(NODE_API.FIAT_CAPTURE_PAYMENT(undefined, 'paypal', 'session-1')).toBe(
      '/fiat/paypal/payments/session-1/capture'
    );
  });

  it('preserves seller storefront routing for legacy orders', async () => {
    await capturePayment('seller-peer', 'paypal', 'session-1');

    expect(authPost).toHaveBeenCalledWith('/fiat/seller-peer/paypal/payments/session-1/capture');
  });
});
