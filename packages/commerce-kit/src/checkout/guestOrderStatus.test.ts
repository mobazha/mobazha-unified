import { describe, expect, it, vi } from 'vitest';
import { createGuestOrderStatusPort, normalizeCommerceGuestOrderStatus } from './guestOrderStatus';

const statusWire = {
  orderToken: 'order/one',
  state: 3,
  paymentAddress: 'address',
  paymentAmount: '100',
  paymentCoin: 'ALT',
  priceCurrency: 'ALT',
  priceDivisibility: 2,
  confirmations: 1,
  requiredConfs: 1,
  expiresAt: '2026-07-05T00:00:00Z',
  items: [],
  createdAt: '2026-07-05T00:00:00Z',
  updatedAt: '2026-07-05T00:01:00Z',
  shippingCarrier: ' UPS ',
};

describe('guest order status contract', () => {
  it('normalizes numeric states and carrier aliases', () => {
    expect(normalizeCommerceGuestOrderStatus(statusWire)).toMatchObject({
      state: 'SHIPPED',
      carrier: 'UPS',
      shippingCarrier: 'UPS',
    });
  });

  it('encodes the token and forwards cancellation through the public port', async () => {
    const request = vi.fn(async <T>() => statusWire as T);
    const signal = new AbortController().signal;

    const order = await createGuestOrderStatusPort({ request }).getOrder('order/one', { signal });

    expect(request).toHaveBeenCalledWith('/v1/guest/orders/order%2Fone', { signal });
    expect(order.state).toBe('SHIPPED');
  });

  it('allows a host-owned API base path', async () => {
    const request = vi.fn(async <T>() => statusWire as T);
    const port = createGuestOrderStatusPort(
      { request },
      { orderPath: token => `/guest/orders/${encodeURIComponent(token)}` }
    );

    await port.getOrder('order one');

    expect(request).toHaveBeenCalledWith('/guest/orders/order%20one', { signal: undefined });
  });
});
