import { describe, expect, it, vi } from 'vitest';
import { createGuestCheckoutPort, normalizeGuestCheckoutSettings } from './contracts';

describe('normalizeGuestCheckoutSettings', () => {
  it('prefers node-computed available coins over configured coins', () => {
    expect(
      normalizeGuestCheckoutSettings({
        enabled: true,
        acceptedCoins: 'BTC, ALT, ETH',
        availableCoins: 'ALT',
        paymentTimeout: 30,
      })
    ).toEqual({
      enabled: true,
      acceptedCoins: ['BTC', 'ALT', 'ETH'],
      availableCoins: ['ALT'],
      paymentTimeoutMinutes: 30,
    });
  });

  it('keeps configured coins unavailable when the node reports no runtime-ready coins', () => {
    expect(
      normalizeGuestCheckoutSettings({
        enabled: true,
        acceptedCoins: 'ALT',
        availableCoins: '',
        paymentTimeout: 0,
      })
    ).toMatchObject({
      acceptedCoins: ['ALT'],
      availableCoins: [],
      paymentTimeoutMinutes: 0,
    });
  });

  it('uses the canonical node settings endpoint', async () => {
    const response = {
      enabled: true,
      acceptedCoins: 'ALT',
      availableCoins: 'ALT',
      paymentTimeout: 30,
    };
    const request = vi.fn(async <T>() => response as T);

    await createGuestCheckoutPort({ request }).getSettings();

    expect(request).toHaveBeenCalledWith('/v1/settings/guest-checkout', {
      signal: undefined,
    });
  });

  it('forwards cancellation through the public port', async () => {
    const request = vi.fn(async <T>() => ({ orderToken: 'order-1' }) as T);
    const signal = new AbortController().signal;

    await createGuestCheckoutPort({ request }).createOrder(
      { items: [], paymentCoin: 'ALT' },
      { signal }
    );

    expect(request).toHaveBeenCalledWith('/v1/guest/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [], paymentCoin: 'ALT' }),
      signal,
    });
  });
});
