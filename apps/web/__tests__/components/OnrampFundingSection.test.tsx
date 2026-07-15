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

/**
 * Renders the section the way the payment page does: onUpdated is an inline
 * arrow, so every parent render hands the section a fresh callback identity.
 */
const renderSection = () =>
  render(
    <OnrampFundingSection
      orderID="order-1"
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

  // The purchase advances only when the browser polls the refresh endpoint.
  // A parent render must not reset that timer: the payment page passes
  // onUpdated as an inline arrow and re-renders on its own schedule (session
  // poll, countdowns), far more often than every 10s. While the polling effect
  // depended on the refresh callback identity, each of those renders tore the
  // interval down and rebuilt it from zero, so the tick never fired and the
  // purchase sat at awaiting_payment forever in a real browser.
  it('polls on schedule even when the parent re-renders in between', async () => {
    const { rerender } = renderSection();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(refreshOrderOnrampFunding).not.toHaveBeenCalled();

    // A parent render lands before the first tick is due, handing the section a
    // brand-new onUpdated identity.
    rerender(
      <OnrampFundingSection
        orderID="order-1"
        source={source}
        onUpdated={next => {
          void next;
        }}
      />
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });

    // 12s elapsed: the 10s tick is due regardless of the render at 6s.
    expect(refreshOrderOnrampFunding).toHaveBeenCalledTimes(1);
  });

  it('stops polling once the purchase is no longer in flight', async () => {
    const settled = { ...(source as object), status: 'delivered' } as never;
    render(<OnrampFundingSection orderID="order-1" source={settled} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });

    expect(refreshOrderOnrampFunding).not.toHaveBeenCalled();
  });
});
