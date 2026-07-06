import { describe, expect, it } from 'vitest';
import {
  RECENT_GUEST_ORDERS_STORAGE_KEY,
  buildGuestOrderRecoveryHref,
  formatRecentGuestOrderPayment,
  forgetGuestOrder,
  loadRecentGuestOrders,
  parseGuestOrderRecoveryInput,
  rememberGuestOrder,
  type GuestOrderRecoveryStorage,
} from '@/lib/guestOrderRecovery';

function memoryStorage(): GuestOrderRecoveryStorage {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

describe('parseGuestOrderRecoveryInput', () => {
  it('accepts a raw order token', () => {
    expect(parseGuestOrderRecoveryInput(' order_123 ')).toEqual({
      orderToken: 'order_123',
      href: '/guest-order/order_123',
    });
  });

  it('accepts a full order URL and preserves a private fragment for this navigation', () => {
    expect(
      parseGuestOrderRecoveryInput(
        'https://bridge.example/guest-order/order_123#buyerPortalToken=private-key'
      )
    ).toEqual({
      orderToken: 'order_123',
      href: '/guest-order/order_123#buyerPortalToken=private-key',
    });
  });

  it('preserves the routed store when recovering a shared TMA order link', () => {
    expect(
      parseGuestOrderRecoveryInput(
        'https://bridge.example/guest-order/order_123?tgWebAppStartParam=OrJTg9x3LLlS8ks-jyd3FA#buyerPortalToken=private-key'
      )
    ).toEqual({
      orderToken: 'order_123',
      storeRouteToken: 'OrJTg9x3LLlS8ks-jyd3FA',
      href: '/guest-order/order_123?tgWebAppStartParam=OrJTg9x3LLlS8ks-jyd3FA#buyerPortalToken=private-key',
    });
  });

  it('converts a legacy query access key into a fragment', () => {
    expect(
      parseGuestOrderRecoveryInput(
        'https://bridge.example/guest-order/order_123?buyerPortalToken=private-key'
      )
    ).toEqual({
      orderToken: 'order_123',
      href: '/guest-order/order_123#buyerPortalToken=private-key',
    });
  });

  it('rejects unrelated URLs and malformed tokens', () => {
    expect(parseGuestOrderRecoveryInput('https://example.com/orders/order_123')).toBeNull();
    expect(parseGuestOrderRecoveryInput('not a token')).toBeNull();
  });
});

describe('buildGuestOrderRecoveryHref', () => {
  it('builds a portable routed-store receipt without moving the buyer key into the query', () => {
    expect(
      buildGuestOrderRecoveryHref('order_123', {
        origin: 'https://bridge.example',
        storeRouteToken: 'OrJTg9x3LLlS8ks-jyd3FA',
        buyerPortalToken: 'private-key',
      })
    ).toBe(
      'https://bridge.example/guest-order/order_123?tgWebAppStartParam=OrJTg9x3LLlS8ks-jyd3FA#buyerPortalToken=private-key'
    );
  });
});

describe('recent guest orders', () => {
  it('formats minimal-unit canonical XMR amounts for buyer-facing history', () => {
    expect(
      formatRecentGuestOrderPayment({
        paymentAmount: '12000000000',
        paymentCoin: 'crypto:monero:mainnet:native',
      })
    ).toBe('0.012 XMR');
    expect(formatRecentGuestOrderPayment({ paymentAmount: '12000000000' })).toBe('');
  });

  it('stores only the bounded public order summary and updates an existing order', () => {
    const storage = memoryStorage();
    rememberGuestOrder(
      {
        orderToken: 'order_123',
        state: 'AWAITING_PAYMENT',
        itemTitles: ['Private consultation'],
        paymentAmount: '0.1',
        paymentCoin: 'XMR',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        lastOpenedAt: '2026-07-01T00:00:00.000Z',
        storeRouteToken: 'OrJTg9x3LLlS8ks-jyd3FA',
      },
      storage
    );
    rememberGuestOrder(
      {
        orderToken: 'order_123',
        state: 'FUNDED',
        itemTitles: ['Private consultation'],
        paymentAmount: '0.1',
        paymentCoin: 'XMR',
        createdAt: '2026-07-02T00:00:00.000Z',
        updatedAt: '2026-07-02T00:00:00.000Z',
        lastOpenedAt: '2026-07-02T00:00:00.000Z',
        storeRouteToken: 'OrJTg9x3LLlS8ks-jyd3FA',
      },
      storage
    );

    expect(loadRecentGuestOrders(storage)).toEqual([
      expect.objectContaining({
        orderToken: 'order_123',
        state: 'FUNDED',
        createdAt: '2026-07-01T00:00:00.000Z',
        storeRouteToken: 'OrJTg9x3LLlS8ks-jyd3FA',
      }),
    ]);
    expect(storage.getItem(RECENT_GUEST_ORDERS_STORAGE_KEY)).not.toContain('buyerPortalToken');
  });

  it('forgets an order and cleans up empty storage', () => {
    const storage = memoryStorage();
    rememberGuestOrder(
      {
        orderToken: 'order_123',
        state: 'AWAITING_PAYMENT',
        itemTitles: [],
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
      storage
    );

    expect(forgetGuestOrder('order_123', storage)).toEqual([]);
    expect(storage.getItem(RECENT_GUEST_ORDERS_STORAGE_KEY)).toBeNull();
  });
});
