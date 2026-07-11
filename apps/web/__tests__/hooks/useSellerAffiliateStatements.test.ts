// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeSellerAffiliateStatementLine, useSellerAffiliateStatements } from '@mobazha/core';
import type { SellerAffiliateStatementLine } from '@mobazha/core';

const listSellerAffiliateStatementsMock =
  vi.fn<(audience: 'seller' | 'promoter') => Promise<SellerAffiliateStatementLine[]>>();

vi.mock('@mobazha/core/services/api/sellerAffiliate', () => ({
  listSellerAffiliateStatements: (audience: 'seller' | 'promoter') =>
    listSellerAffiliateStatementsMock(audience),
}));

function line(
  settlementState?: 'planned' | 'submitted' | 'confirmed'
): SellerAffiliateStatementLine {
  return normalizeSellerAffiliateStatementLine({
    attribution: {
      id: 'attribution-1',
      orderID: 'order-1',
      referralSessionID: 'referral-1',
      programID: 'program-1',
      sellerPeerID: 'seller-1',
      buyerKind: 'peer',
      buyerPeerID: 'buyer-1',
      promoterPeerID: 'promoter-1',
      commissionRateBPSSnapshot: 1000,
      attributedAt: '2026-07-11T00:00:00Z',
    },
    commissionLine: {
      attributionID: 'attribution-1',
      orderID: 'order-1',
      orderLineID: 'line-1',
      netMerchandiseAtomic: '1000',
      commissionAtomic: '100',
      currency: 'crypto:eip155:1:native',
      status: 'pending',
    },
    ...(settlementState
      ? {
          settlement: {
            actionId: 'action-1',
            action: 'complete',
            state: settlementState,
            coin: 'crypto:eip155:1:native',
            amount: '100',
            address: '0x1111111111111111111111111111111111111111',
            updatedAt: '2026-07-11T01:00:00Z',
          },
        }
      : {}),
  });
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Flushes pending microtasks (e.g. an already-resolved mock promise) without real delay. */
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('useSellerAffiliateStatements polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    listSellerAffiliateStatementsMock.mockReset();
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not poll when nothing is in flight (pure pending, no settlement)', async () => {
    listSellerAffiliateStatementsMock.mockResolvedValue([line()]);
    renderHook(() => useSellerAffiliateStatements('seller'));

    await flush();
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(1);
  });

  it('polls at a low frequency while a settlement is submitted, and stops once confirmed', async () => {
    listSellerAffiliateStatementsMock
      .mockResolvedValueOnce([line('submitted')])
      .mockResolvedValueOnce([line('submitted')])
      .mockResolvedValueOnce([line('confirmed')]);

    renderHook(() => useSellerAffiliateStatements('seller'));

    await flush();
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(3);

    // Confirmed now — further ticks must not trigger another request.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(3);
  });

  it('pauses while the tab is hidden and refetches immediately on becoming visible', async () => {
    listSellerAffiliateStatementsMock.mockResolvedValue([line('planned')]);
    renderHook(() => useSellerAffiliateStatements('seller'));

    await flush();
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(1);

    act(() => {
      setVisibility('hidden');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      setVisibility('visible');
      await Promise.resolve();
    });
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(2);
  });

  it('never issues a second poll while a prior poll is still in flight', async () => {
    let resolvePoll: (value: SellerAffiliateStatementLine[]) => void = () => {};
    listSellerAffiliateStatementsMock
      .mockResolvedValueOnce([line('submitted')])
      .mockImplementationOnce(
        () =>
          new Promise<SellerAffiliateStatementLine[]>(resolve => {
            resolvePoll = resolve;
          })
      );

    renderHook(() => useSellerAffiliateStatements('seller'));

    // Initial load establishes the poll timer.
    await flush();
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(1);

    // First tick starts a poll that never resolves within this window.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(2);

    // A second full interval elapses while that poll is still in flight: the timer fires
    // again, but the in-flight guard must stop it from calling the API a third time.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolvePoll([line('submitted')]);
      await Promise.resolve();
    });
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(2);
  });

  it('stops the poll timer on unmount', async () => {
    listSellerAffiliateStatementsMock.mockResolvedValue([line('submitted')]);
    const { unmount } = renderHook(() => useSellerAffiliateStatements('seller'));

    await flush();
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(listSellerAffiliateStatementsMock).toHaveBeenCalledTimes(1);
  });
});
