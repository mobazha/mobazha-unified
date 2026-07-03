import { describe, expect, it, vi } from 'vitest';
import { createGuestCheckoutAdapter, normalizeGuestCheckoutSettings } from './contracts';

describe('normalizeGuestCheckoutSettings', () => {
  it('prefers node-computed available coins over configured coins', () => {
    expect(
      normalizeGuestCheckoutSettings({
        enabled: true,
        acceptedCoins: 'BTC, XMR, ETH',
        availableCoins: 'XMR',
        paymentTimeout: 30,
      })
    ).toEqual({
      enabled: true,
      acceptedCoins: ['BTC', 'XMR', 'ETH'],
      availableCoins: ['XMR'],
      paymentTimeoutMinutes: 30,
    });
  });

  it('keeps configured coins unavailable when the node reports no runtime-ready coins', () => {
    expect(
      normalizeGuestCheckoutSettings({
        enabled: true,
        acceptedCoins: 'XMR',
        availableCoins: '',
        paymentTimeout: 0,
      })
    ).toMatchObject({
      acceptedCoins: ['XMR'],
      availableCoins: [],
      paymentTimeoutMinutes: 0,
    });
  });

  it('uses the canonical node settings endpoint', async () => {
    const response = {
      enabled: true,
      acceptedCoins: 'XMR',
      availableCoins: 'XMR',
      paymentTimeout: 30,
    };
    const request = vi.fn(async <T>() => response as T);

    await createGuestCheckoutAdapter({ request }).getSettings();

    expect(request).toHaveBeenCalledWith('/v1/settings/guest-checkout');
  });
});
