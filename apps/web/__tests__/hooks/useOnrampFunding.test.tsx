// SPDX-License-Identifier: MIT
// Copyright (c) 2026 fengzie and the respective contributors.

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnrampFunding } from '../../../../packages/core/hooks/useOnrampFunding';
import type { OnrampFundingSourceView, PaymentSession } from '../../../../packages/core/types';

const getOrderOnrampProviders = vi.fn();
const initiateOrderOnrampFunding = vi.fn();
const refreshOrderOnrampFunding = vi.fn();
const getOrderPaymentSession = vi.fn();

vi.mock('../../../../packages/core/services/api/orders', () => ({
  getOrderOnrampProviders: (...args: unknown[]) => getOrderOnrampProviders(...args),
  initiateOrderOnrampFunding: (...args: unknown[]) => initiateOrderOnrampFunding(...args),
  refreshOrderOnrampFunding: (...args: unknown[]) => refreshOrderOnrampFunding(...args),
  getOrderPaymentSession: (...args: unknown[]) => getOrderPaymentSession(...args),
}));

const source: OnrampFundingSourceView = {
  providerID: 'mock-onramp',
  onrampOrderID: 'mock-onramp-1',
  status: 'awaiting_payment',
  deliverToBuyerWallet: false,
  buyerActionURL: 'https://mock-onramp.example/checkout/mock-onramp-1',
  updatedAt: '2026-07-15T00:00:00Z',
};

const paymentSession = {
  status: 'awaiting_funds',
  fundingTarget: {
    type: 'address',
    assetID: 'crypto:eip155:1:native',
    address: '0xescrow',
    amount: '1',
  },
  onrampFunding: source,
} as unknown as PaymentSession;

let orderSequence = 0;
const nextOrderID = () => `onramp-hook-order-${++orderSequence}`;

describe('useOnrampFunding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getOrderOnrampProviders.mockReset();
    initiateOrderOnrampFunding.mockReset();
    refreshOrderOnrampFunding.mockReset();
    getOrderPaymentSession.mockReset();
    getOrderOnrampProviders.mockResolvedValue([
      {
        providerID: 'mock-onramp',
        railID: 'crypto:eip155:1:native',
        deliverToTarget: true,
        fiatCurrencies: ['USD'],
      },
    ]);
    initiateOrderOnrampFunding.mockResolvedValue(source);
    refreshOrderOnrampFunding.mockResolvedValue(source);
    getOrderPaymentSession.mockResolvedValue(paymentSession);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('discovers a direct provider and initiates through it', async () => {
    const orderID = nextOrderID();
    const { result } = renderHook(() =>
      useOnrampFunding({ orderID, paymentSession: { ...paymentSession, onrampFunding: null } })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.directProviders).toHaveLength(1);
    await act(async () => {
      await result.current.initiateDirect();
    });

    expect(initiateOrderOnrampFunding).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: orderID,
        providerID: 'mock-onramp',
        fiatCurrency: 'USD',
        deliverToBuyerWallet: false,
      })
    );
    expect(result.current.source).toEqual(source);
  });

  it('polls immediately and does not overlap a slow refresh', async () => {
    const orderID = nextOrderID();
    let resolveRefresh: ((value: typeof source) => void) | undefined;
    refreshOrderOnrampFunding.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRefresh = resolve;
        })
    );

    renderHook(() => useOnrampFunding({ orderID, paymentSession }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.(source);
      await Promise.resolve();
    });
  });

  it('throttles immediate refreshes across rapid remounts', async () => {
    const orderID = nextOrderID();
    for (let index = 0; index < 5; index += 1) {
      const { unmount } = renderHook(() => useOnrampFunding({ orderID, paymentSession }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      unmount();
    }
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    renderHook(() => useOnrampFunding({ orderID, paymentSession }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(2);
  });

  it('stops polling after a null lifecycle view and refreshes the payment session once', async () => {
    const orderID = nextOrderID();
    const onPaymentSessionUpdated = vi.fn();
    refreshOrderOnrampFunding.mockResolvedValue(null);

    renderHook(() => useOnrampFunding({ orderID, paymentSession, onPaymentSessionUpdated }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(1);
    expect(getOrderPaymentSession).toHaveBeenCalledTimes(1);
    expect(onPaymentSessionUpdated).toHaveBeenCalledTimes(1);
  });

  it('keeps the poll schedule stable when callback identity changes', async () => {
    const orderID = nextOrderID();
    let callback = vi.fn();
    const { rerender } = renderHook(() =>
      useOnrampFunding({ orderID, paymentSession, onPaymentSessionUpdated: callback })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    callback = vi.fn();
    rerender();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });

    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(2);
  });
});
