// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const { createOrderPaymentSelectionQuote } = vi.hoisted(() => ({
  createOrderPaymentSelectionQuote: vi.fn(),
}));

vi.mock('@mobazha/core/services/api/orders', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core/services/api/orders')>();
  return {
    ...actual,
    ordersApi: {
      ...actual.ordersApi,
      createOrderPaymentSelectionQuote,
    },
  };
});

import { usePaymentSelectionQuote } from '@mobazha/core/hooks/usePaymentSelectionQuote';

const mockQuote = {
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
};

describe('usePaymentSelectionQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays idle when disabled', async () => {
    const { result } = renderHook(() =>
      usePaymentSelectionQuote({
        enabled: false,
        orderID: 'order-1',
        paymentCoin: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(createOrderPaymentSelectionQuote).not.toHaveBeenCalled();
    expect(result.current.quote).toBeNull();
    expect(result.current.canUseQuote).toBe(false);
  });

  it('loads quote when enabled and exposes quote id', async () => {
    createOrderPaymentSelectionQuote.mockResolvedValue(mockQuote);

    const { result } = renderHook(() =>
      usePaymentSelectionQuote({
        enabled: true,
        orderID: 'order-1',
        paymentCoin: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(350);
      await Promise.resolve();
    });

    expect(result.current.canUseQuote).toBe(true);
    expect(result.current.paymentSelectionQuoteID).toBe('psq-1');
  });

  it('marks expired quotes unusable with fake timers', async () => {
    createOrderPaymentSelectionQuote.mockResolvedValue({
      ...mockQuote,
      expiresAt: '2026-07-05T12:00:00.000Z',
    });

    vi.setSystemTime(new Date('2026-07-05T11:59:30.000Z'));

    const { result } = renderHook(() =>
      usePaymentSelectionQuote({
        enabled: true,
        orderID: 'order-1',
        paymentCoin: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(350);
      await Promise.resolve();
    });

    expect(result.current.canUseQuote).toBe(true);

    await act(async () => {
      vi.setSystemTime(new Date('2026-07-05T12:00:01.000Z'));
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.expired).toBe(true);
    expect(result.current.canUseQuote).toBe(false);
    expect(result.current.paymentSelectionQuoteID).toBeUndefined();
  });
});
