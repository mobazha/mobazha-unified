import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  completeGuestOrder,
  createGuestOrder,
  getGuestCheckoutSettings,
  normalizeGuestOrderStatus,
  quoteGuestOrderSupply,
  shipGuestOrder,
} from '../../services/api/guestCheckout';

vi.mock('../../services/api/helpers', () => ({
  authPut: vi.fn(),
  authPost: vi.fn(),
  anonymousGet: vi.fn(),
  anonymousPost: vi.fn(),
}));

import { anonymousGet, anonymousPost, authPost, authPut } from '../../services/api/helpers';

const statusDto = {
  orderToken: 'tok',
  state: 'SHIPPED',
  paymentAddress: 'addr',
  paymentAmount: '100',
  paymentCoin: 'BTC',
  priceCurrency: 'USD',
  priceDivisibility: 2,
  confirmations: 6,
  requiredConfs: 1,
  expiresAt: '2026-05-18T12:00:00Z',
  createdAt: '2026-05-18T12:00:00Z',
  updatedAt: '2026-05-19T12:00:00Z',
  items: [],
  shippingCarrier: 'UPS',
};

describe('normalizeGuestOrderStatus', () => {
  it('maps shippingCarrier to carrier for buyer UI', () => {
    const normalized = normalizeGuestOrderStatus({
      orderToken: 'tok',
      state: 'SHIPPED',
      paymentAddress: 'addr',
      paymentAmount: '100',
      paymentCoin: 'BTC',
      priceCurrency: 'USD',
      priceDivisibility: 2,
      confirmations: 0,
      requiredConfs: 1,
      expiresAt: '2026-05-18T12:00:00Z',
      createdAt: '2026-05-18T12:00:00Z',
      updatedAt: '2026-05-19T12:00:00Z',
      items: [],
      shippingCarrier: 'UPS',
      trackingNumber: '1Z999',
      fundedAt: '2026-05-18T13:00:00Z',
      shippedAt: '2026-05-19T10:00:00Z',
    });

    expect(normalized.state).toBe('SHIPPED');
    expect(normalized.carrier).toBe('UPS');
    expect(normalized.shippingCarrier).toBe('UPS');
    expect(normalized.fundedAt).toBe('2026-05-18T13:00:00Z');
  });

  it('normalizes numeric seller-list state codes', () => {
    expect(
      normalizeGuestOrderStatus({
        orderToken: 'tok',
        state: 2,
        paymentAddress: 'addr',
        paymentAmount: '100',
        paymentCoin: 'BTC',
        priceCurrency: 'USD',
        priceDivisibility: 2,
        confirmations: 0,
        requiredConfs: 1,
        expiresAt: '2026-05-18T12:00:00Z',
        createdAt: '2026-05-18T12:00:00Z',
        updatedAt: '2026-05-18T12:00:00Z',
        items: [],
      }).state
    ).toBe('FUNDED');
  });
});

describe('guest order mutations', () => {
  beforeEach(() => {
    vi.mocked(authPut).mockReset();
    vi.mocked(authPost).mockReset();
    vi.mocked(anonymousGet).mockReset();
    vi.mocked(anonymousPost).mockReset();
  });

  it('posts guest supply quote to anonymous quote endpoint', async () => {
    vi.mocked(anonymousPost).mockResolvedValue({
      canSell: true,
      items: [{ listingSlug: 'item-a', quantity: 1, status: 'available', available: true }],
    });

    const result = await quoteGuestOrderSupply({
      items: [{ listingSlug: 'item-a', listingHash: 'hash', quantity: 1 }],
    });

    expect(anonymousPost).toHaveBeenCalledWith('/guest/orders/quote', {
      items: [{ listingSlug: 'item-a', listingHash: 'hash', quantity: 1 }],
    });
    expect(result.canSell).toBe(true);
  });

  it('routes settings and order creation through anonymous helpers', async () => {
    vi.mocked(anonymousGet).mockResolvedValue({
      enabled: true,
      acceptedCoins: 'BTC',
      availableCoins: 'BTC',
      paymentTimeout: 30,
    });
    vi.mocked(anonymousPost).mockResolvedValue({ orderToken: 'guest-order' });

    await getGuestCheckoutSettings();
    await createGuestOrder({ items: [], paymentCoin: 'BTC' });

    expect(anonymousGet).toHaveBeenCalledWith('/settings/guest-checkout');
    expect(anonymousPost).toHaveBeenCalledWith(
      '/guest/orders',
      {
        items: [],
        paymentCoin: 'BTC',
      },
      undefined
    );
  });

  it('forwards order cancellation to the anonymous request boundary', async () => {
    vi.mocked(anonymousPost).mockResolvedValue({ orderToken: 'guest-order' });
    const controller = new AbortController();

    await createGuestOrder({ items: [], paymentCoin: 'BTC' }, { signal: controller.signal });

    expect(anonymousPost).toHaveBeenCalledWith(
      '/guest/orders',
      { items: [], paymentCoin: 'BTC' },
      { signal: controller.signal }
    );
  });

  it('forwards settings cancellation to the anonymous request boundary', async () => {
    vi.mocked(anonymousGet).mockResolvedValue({
      enabled: true,
      acceptedCoins: 'BTC',
      availableCoins: 'BTC',
      paymentTimeout: 30,
    });
    const controller = new AbortController();

    await getGuestCheckoutSettings({ signal: controller.signal });

    expect(anonymousGet).toHaveBeenCalledWith('/settings/guest-checkout', {
      signal: controller.signal,
    });
  });

  it('refetches status after ship returns 204', async () => {
    vi.mocked(authPut).mockResolvedValue(undefined);
    vi.mocked(anonymousGet).mockResolvedValue(statusDto);

    const result = await shipGuestOrder('tok', { carrier: 'UPS', trackingNumber: '1Z999' });

    expect(authPut).toHaveBeenCalledOnce();
    expect(anonymousGet).toHaveBeenCalledOnce();
    expect(result.state).toBe('SHIPPED');
    expect(result.carrier).toBe('UPS');
  });

  it('refetches status after complete returns 204', async () => {
    vi.mocked(authPost).mockResolvedValue(undefined);
    vi.mocked(anonymousGet).mockResolvedValue({ ...statusDto, state: 'COMPLETED' });

    const result = await completeGuestOrder('tok');

    expect(authPost).toHaveBeenCalledOnce();
    expect(anonymousGet).toHaveBeenCalledOnce();
    expect(result.state).toBe('COMPLETED');
  });
});
