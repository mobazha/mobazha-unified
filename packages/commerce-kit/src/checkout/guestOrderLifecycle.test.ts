import { describe, expect, it } from 'vitest';
import type { CommerceGuestOrderStatus } from './guestOrderStatus';
import {
  INITIAL_COMMERCE_GUEST_ORDER_STATE,
  commerceGuestOrderLifecycleReducer,
  shouldPollCommerceGuestOrder,
} from './guestOrderLifecycle';

const order: CommerceGuestOrderStatus = {
  orderToken: 'order-1',
  state: 'AWAITING_PAYMENT',
  paymentAddress: 'address',
  paymentAmount: '100',
  paymentCoin: 'ALT',
  priceCurrency: 'ALT',
  priceDivisibility: 2,
  confirmations: 0,
  requiredConfs: 1,
  expiresAt: '2026-07-05T00:00:00Z',
  items: [],
  createdAt: '2026-07-05T00:00:00Z',
  updatedAt: '2026-07-05T00:00:00Z',
};

describe('commerce guest order lifecycle', () => {
  it('loads, refreshes and preserves the last usable order across a polling failure', () => {
    const loading = commerceGuestOrderLifecycleReducer(INITIAL_COMMERCE_GUEST_ORDER_STATE, {
      type: 'load-started',
      orderToken: order.orderToken,
    });
    const ready = commerceGuestOrderLifecycleReducer(loading, {
      type: 'order-loaded',
      orderToken: order.orderToken,
      order,
    });
    const refreshing = commerceGuestOrderLifecycleReducer(ready, {
      type: 'load-started',
      orderToken: order.orderToken,
    });
    const error = commerceGuestOrderLifecycleReducer(refreshing, {
      type: 'load-failed',
      orderToken: order.orderToken,
      error: new Error('offline'),
    });

    expect(loading).toEqual({ status: 'loading', orderToken: order.orderToken });
    expect(refreshing).toEqual({ status: 'refreshing', orderToken: order.orderToken, order });
    expect(error).toMatchObject({ status: 'error', order });
  });

  it('does not expose or preserve an order while switching tokens', () => {
    const ready = {
      status: 'ready' as const,
      orderToken: order.orderToken,
      order,
    };
    const loadingNext = commerceGuestOrderLifecycleReducer(ready, {
      type: 'load-started',
      orderToken: 'order-2',
    });

    expect(loadingNext).toEqual({ status: 'loading', orderToken: 'order-2' });
  });

  it('polls active states and stops at every terminal state', () => {
    expect(shouldPollCommerceGuestOrder('AWAITING_PAYMENT')).toBe(true);
    expect(shouldPollCommerceGuestOrder('SHIPPED')).toBe(true);
    expect(shouldPollCommerceGuestOrder('COMPLETED')).toBe(false);
    expect(shouldPollCommerceGuestOrder('EXPIRED')).toBe(false);
    expect(shouldPollCommerceGuestOrder('CANCELLED')).toBe(false);
  });
});
