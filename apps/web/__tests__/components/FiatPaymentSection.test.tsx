// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createLegacySession: vi.fn(),
  createQuotedSession: vi.fn(),
}));

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  useFiatPayment: () => ({
    createSession: mocks.createLegacySession,
    session: null,
    status: 'idle',
    error: null,
    reset: vi.fn(),
  }),
  useQuotedFiatPayment: () => ({
    createSession: mocks.createQuotedSession,
    session: null,
    status: 'idle',
    error: null,
    reset: vi.fn(),
  }),
}));

import { FiatPaymentSection } from '@/components/Payment/FiatPaymentSection';

const baseProps = {
  providerID: 'paypal',
  orderID: 'order-1',
  amount: 100,
  currency: 'USD',
  returnUrl: 'https://example.test/return',
  onPaymentSuccess: vi.fn(),
};

describe('FiatPaymentSection runtime routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a Deal session without a seller peer route', async () => {
    render(
      <FiatPaymentSection
        {...baseProps}
        dealPaymentSessionRequest={{
          paymentCoin: 'fiat:paypal:USD',
          paymentSelectionQuoteID: 'quote-1',
        }}
      />
    );

    await waitFor(() =>
      expect(mocks.createQuotedSession).toHaveBeenCalledWith({
        orderId: 'order-1',
        paymentCoin: 'fiat:paypal:USD',
        paymentSelectionQuoteID: 'quote-1',
      })
    );
    expect(mocks.createLegacySession).not.toHaveBeenCalled();
  });

  it('requires a seller peer route for legacy provider sessions', async () => {
    render(<FiatPaymentSection {...baseProps} />);

    await waitFor(() => expect(mocks.createLegacySession).not.toHaveBeenCalled());
    expect(mocks.createQuotedSession).not.toHaveBeenCalled();
  });
});
