// SPDX-License-Identifier: MIT
// Copyright (c) 2026 fengzie and the respective contributors.

import { render, act, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OnrampFundingSection } from '@/components/Payment/OnrampFundingSection';

const refreshOrderOnrampFunding = vi.fn();

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  ordersApi: {
    refreshOrderOnrampFunding: (...args: unknown[]) => refreshOrderOnrampFunding(...args),
  },
}));

const source = {
  providerID: 'mock-onramp',
  onrampOrderID: 'mock-onramp-1',
  status: 'awaiting_payment',
  deliverToBuyerWallet: false,
  buyerActionURL: 'https://mock-onramp.example/checkout/mock-onramp-1',
  disclosure: 'disclosure',
  updatedAt: '2026-07-15T00:00:00Z',
} as never;

// The mount-refresh throttle is module-level state keyed by orderID (that is
// the point — it must survive remounts), so every test uses its own orderID.
let orderSeq = 0;
const nextOrderID = () => `order-${++orderSeq}`;

/**
 * Renders the section the way the payment page does: onUpdated is an inline
 * arrow, so every parent render hands the section a fresh callback identity.
 */
const renderSection = (orderID: string) =>
  render(
    <OnrampFundingSection
      orderID={orderID}
      source={source}
      onUpdated={next => {
        void next;
      }}
    />
  );

describe('OnrampFundingSection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshOrderOnrampFunding.mockReset();
    refreshOrderOnrampFunding.mockResolvedValue(source);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Mount must refresh immediately: the payment page can remount the section
  // (session refetches swap the subtree), and a poll that only fires after a
  // full quiet interval is starved by that churn — observed live as refreshes
  // minutes apart. Remounting itself must drive the poll.
  it('refreshes immediately on first mount', async () => {
    renderSection(nextOrderID());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(1);
  });

  // ...but remount churn must NOT multiply requests: with the page remounting
  // the section on every session refetch, an unthrottled mount refresh closed
  // a response-paced request loop (observed live at 19-34 req/s, rendered as
  // page flicker). The throttle lives outside the component so a fresh
  // instance cannot bypass it.
  it('throttles the mount refresh across rapid remounts', async () => {
    const orderID = nextOrderID();
    for (let i = 0; i < 5; i++) {
      const { unmount } = renderSection(orderID);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      unmount();
    }
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(1);

    // After the throttle window a remount refreshes again.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    renderSection(orderID);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(2);
  });

  it('polls on schedule even when the parent re-renders in between', async () => {
    const orderID = nextOrderID();
    const { rerender } = renderSection(orderID);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(1); // the mount refresh only

    // A parent render lands before the first tick is due, handing the section a
    // brand-new onUpdated identity.
    rerender(
      <OnrampFundingSection
        orderID={orderID}
        source={source}
        onUpdated={next => {
          void next;
        }}
      />
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });

    // 12s elapsed: mount refresh + the 10s tick, which must be due regardless
    // of the parent render at 6s.
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(2);
  });

  it('stops polling once the purchase is no longer in flight', async () => {
    const settled = { ...(source as object), status: 'delivered' } as never;
    render(<OnrampFundingSection orderID={nextOrderID()} source={settled} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });

    expect(refreshOrderOnrampFunding).not.toHaveBeenCalled();
  });

  it('stops polling and propagates a null refresh only once', async () => {
    const onUpdated = vi.fn();
    const orderID = nextOrderID();
    refreshOrderOnrampFunding.mockResolvedValue(null);
    render(<OnrampFundingSection orderID={orderID} source={source} onUpdated={onUpdated} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onUpdated).toHaveBeenCalledWith(null);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(1);
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it('propagates same-status action URL refreshes', async () => {
    const onUpdated = vi.fn();
    const next = {
      ...(source as object),
      buyerActionURL: 'https://mock-onramp.example/checkout/fresh-session',
      updatedAt: '2026-07-15T00:00:05Z',
    };
    refreshOrderOnrampFunding.mockResolvedValue(next);

    render(<OnrampFundingSection orderID={nextOrderID()} source={source} onUpdated={onUpdated} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining(next));
    expect(screen.getByRole('link')).toHaveAttribute('href', next.buyerActionURL);
  });

  it('does not overlap slow refresh requests', async () => {
    let resolveRefresh: ((value: typeof source) => void) | undefined;
    refreshOrderOnrampFunding.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRefresh = resolve;
        })
    );

    renderSection(nextOrderID());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.(source);
      await Promise.resolve();
    });
  });
});
