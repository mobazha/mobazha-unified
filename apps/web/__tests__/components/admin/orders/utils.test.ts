import { describe, expect, it } from 'vitest';
import type { GuestOrderSummary } from '@mobazha/core/services/api/guestCheckout';
import {
  formatGuestPaymentAmount,
  getGuestPaymentAmountValue,
  guestOrderToExportRow,
} from '@/components/admin/orders/utils';

const baseGuestOrder: GuestOrderSummary = {
  orderToken: 'gst_test_123',
  state: 'AWAITING_PAYMENT',
  paymentCoin: 'ETH',
  paymentAmount: '28500000000000000',
  priceCurrency: 'USD',
  items: [
    {
      listingHash: 'QmTestHash123',
      listingTitle: 'Test listing',
      listingSlug: 'test-listing',
      sellerPeerID: 'QmSellerPeerID',
      quantity: 1,
      unitPrice: '2500',
    },
  ],
  contactEmail: 'buyer@example.com',
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-18T12:00:00.000Z',
};

describe('guest order payment formatting', () => {
  it('formats payment amount using the payment coin rather than listing currency', () => {
    expect(formatGuestPaymentAmount(baseGuestOrder)).toBe('0.0285 ETH');
    expect(getGuestPaymentAmountValue(baseGuestOrder)).toBe('0.0285');
  });

  it('supports bitcoin-scale minimal units', () => {
    const btcOrder: GuestOrderSummary = {
      ...baseGuestOrder,
      paymentCoin: 'BTC',
      paymentAmount: '45000',
    };

    expect(formatGuestPaymentAmount(btcOrder)).toBe('0.00045 BTC');
    expect(getGuestPaymentAmountValue(btcOrder)).toBe('0.00045');
  });
});

describe('guest order export rows', () => {
  it('exports guest orders with payment-coin totals', () => {
    expect(guestOrderToExportRow(baseGuestOrder)).toEqual({
      orderId: 'gst_test_123',
      date: '2026-05-18T12:00:00.000Z',
      title: 'Test listing',
      buyer: 'buyer@example.com',
      total: '0.0285',
      currency: 'ETH',
      status: 'AWAITING_PAYMENT',
      paymentCoin: 'ETH',
    });
  });
});
