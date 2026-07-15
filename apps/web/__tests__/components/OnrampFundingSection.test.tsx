import { render, act } from '@testing-library/react';
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
    refreshOrderOnrampFunding.mockResolvedValue(null);
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

  // A null refresh (settled or nothing in flight) must not propagate upward:
  // onUpdated triggers an unconditional session refetch in the page, and
  // null-on-every-poll turned that into a request loop.
  it('only propagates real provider transitions to onUpdated', async () => {
    const onUpdated = vi.fn();
    const orderID = nextOrderID();
    render(<OnrampFundingSection orderID={orderID} source={source} onUpdated={onUpdated} />);

    // First poll returns null — no propagation.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onUpdated).not.toHaveBeenCalled();

    // Next tick reports a real transition — propagate once.
    refreshOrderOnrampFunding.mockResolvedValue({ ...(source as object), status: 'processing' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onUpdated.mock.calls[0][0]).toMatchObject({ status: 'processing' });

    // Same status again — no re-propagation.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });
});
