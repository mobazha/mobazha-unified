// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import type { PaymentSession } from '../../types/paymentSession';
import { paymentSessionToFiatSession } from '../../utils/transforms/paymentSessionFiat';

function providerSession(providerData: Record<string, unknown>): PaymentSession {
  return {
    sessionID: 'ps-order-1',
    orderID: 'order-1',
    paymentCoin: 'fiat:stripe:USD',
    settlementMode: 'provider_checkout',
    productMode: 'cancelable',
    status: 'awaiting_funds',
    expectedAmount: '49',
    expiresAt: '2026-07-05T12:15:00Z',
    fundingTarget: {
      type: 'provider_session',
      assetID: 'fiat:stripe:USD',
      amount: '49',
      providerData,
    },
    paymentProgress: {
      observedAmount: '0',
      requiredAmount: '49',
      remainingAmount: '49',
      observationCount: 0,
      fundingState: 'provider_processing',
    },
  };
}

describe('paymentSessionToFiatSession', () => {
  it('maps the flat Stripe providerData returned by Core', () => {
    const result = paymentSessionToFiatSession(
      providerSession({
        providerID: 'stripe',
        sessionID: 'pi_123',
        captureMode: 'automatic',
        clientSecret: 'secret',
        publishableKey: 'pk_test',
        connectedAccountId: 'acct_1',
      })
    );

    expect(result?.sessionID).toBe('pi_123');
    expect(result?.stripe).toEqual({
      clientSecret: 'secret',
      publishableKey: 'pk_test',
      connectedAccountId: 'acct_1',
    });
  });

  it('maps the flat PayPal providerData returned by Core', () => {
    const result = paymentSessionToFiatSession(
      providerSession({
        providerID: 'paypal',
        sessionID: 'paypal-session',
        captureMode: 'manual',
        orderID: 'paypal-order',
        clientID: 'paypal-client',
      })
    );

    expect(result?.captureMode).toBe('manual');
    expect(result?.paypal).toEqual({ orderID: 'paypal-order', clientID: 'paypal-client' });
  });

  it('fails closed when provider checkout credentials are incomplete', () => {
    expect(paymentSessionToFiatSession(providerSession({ providerID: 'stripe' }))).toBeNull();
  });
});
