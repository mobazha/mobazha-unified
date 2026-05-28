import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  completeGuestOrder,
  normalizeGuestOrderStatus,
  shipGuestOrder,
} from '../../services/api/guestCheckout';

vi.mock('../../services/api/helpers', () => ({
  authPut: vi.fn(),
  authPost: vi.fn(),
  publicGet: vi.fn(),
}));

import { authPost, authPut, publicGet } from '../../services/api/helpers';

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
    vi.mocked(publicGet).mockReset();
  });

  it('refetches status after ship returns 204', async () => {
    vi.mocked(authPut).mockResolvedValue(undefined);
    vi.mocked(publicGet).mockResolvedValue(statusDto);

    const result = await shipGuestOrder('tok', { carrier: 'UPS', trackingNumber: '1Z999' });

    expect(authPut).toHaveBeenCalledOnce();
    expect(publicGet).toHaveBeenCalledOnce();
    expect(result.state).toBe('SHIPPED');
    expect(result.carrier).toBe('UPS');
  });

  it('refetches status after complete returns 204', async () => {
    vi.mocked(authPost).mockResolvedValue(undefined);
    vi.mocked(publicGet).mockResolvedValue({ ...statusDto, state: 'COMPLETED' });

    const result = await completeGuestOrder('tok');

    expect(authPost).toHaveBeenCalledOnce();
    expect(publicGet).toHaveBeenCalledOnce();
    expect(result.state).toBe('COMPLETED');
  });
});
