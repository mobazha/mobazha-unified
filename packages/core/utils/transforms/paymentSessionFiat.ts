// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { PaymentSession } from '../../types/paymentSession';
import type { FiatPaymentSession } from '../../types/fiat';

/** Map unified PaymentSession provider_checkout payload to fiat provider session shape. */
export function paymentSessionToFiatSession(session: PaymentSession): FiatPaymentSession | null {
  if (session.settlementMode !== 'provider_checkout') return null;

  const providerData = session.fundingTarget?.providerData;
  if (!providerData) return null;

  const providerID = typeof providerData.providerID === 'string' ? providerData.providerID : '';
  const captureMode = providerData.captureMode === 'manual' ? 'manual' : 'automatic';
  const mapped: FiatPaymentSession = {
    sessionID:
      typeof providerData.sessionID === 'string' ? providerData.sessionID : session.sessionID,
    captureMode,
    expiresAt:
      typeof providerData.expiresAt === 'string' ? providerData.expiresAt : session.expiresAt,
    status:
      typeof providerData.providerStatus === 'string'
        ? providerData.providerStatus
        : session.status,
    approveURL: typeof providerData.approveURL === 'string' ? providerData.approveURL : undefined,
  };

  if (
    providerID === 'stripe' &&
    typeof providerData.clientSecret === 'string' &&
    typeof providerData.publishableKey === 'string'
  ) {
    mapped.stripe = {
      clientSecret: providerData.clientSecret,
      publishableKey: providerData.publishableKey,
      connectedAccountId:
        typeof providerData.connectedAccountId === 'string'
          ? providerData.connectedAccountId
          : undefined,
    };
  }

  if (
    providerID === 'paypal' &&
    typeof providerData.orderID === 'string' &&
    typeof providerData.clientID === 'string'
  ) {
    mapped.paypal = {
      orderID: providerData.orderID,
      clientID: providerData.clientID,
    };
  }

  return mapped.stripe || mapped.paypal ? mapped : null;
}
