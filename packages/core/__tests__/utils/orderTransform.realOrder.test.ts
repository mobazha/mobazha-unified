import { describe, expect, it } from 'vitest';

import { formatPaymentAmount } from '../../services/currencyService';
import { transformCoreOrder } from '../../utils/transforms/orderTransform';

const DEMO_ORDER_FIXTURE = {
  state: 'PENDING',
  contract: {
    OrderID: 'QmW8vaurWHRUx3UL4JFaDCufrRLZcC5DZvvu3jHUSpbnSe',
    orderOpen: {
      timestamp: '2026-05-23T07:54:00.000Z',
      pricingCoin: 'ETH',
      amount: '11000000000000000',
      buyerID: { peerID: '12D3KooWEfPTHZYjdoLhoJiTvan2gUg6jxm7rvcFvtZSsRFHezAo' },
      listings: [
        {
          listing: {
            slug: 'e2e-chain-test-98000',
            metadata: {
              contractType: 'PHYSICAL_GOOD',
              pricingCurrency: { code: 'ETH', divisibility: 18 },
            },
            item: {
              title: 'E2E Chain Test 98000',
              price: 10000000000000000,
              images: [],
            },
            vendorID: { peerID: '12D3KooWTestSeller', name: 'E2E Seller' },
          },
        },
      ],
      items: [{ quantity: 1 }],
      shipping: {},
    },
    paymentSent: {
      coin: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
      amount: '29838',
      method: 'CANCELABLE',
      transactionID: 'c858f37b43b443e5caf12986cc64fd4ddcb21ecad2dc4a33a3c62f1adb4d70c5',
    },
  },
} as const;

describe('formatPaymentAmount', () => {
  it('shows small BTC payments with significant digits instead of zero', () => {
    expect(formatPaymentAmount('0.00029838', undefined, 'BTC')).toBe('0.0002984 BTC');
  });
});

describe('transformCoreOrder demo ETH listing + BTC payment', () => {
  it('maps paymentSent satoshis to standard-unit display fields', () => {
    const order = transformCoreOrder(DEMO_ORDER_FIXTURE as any, {
      currentUserPeerID: '12D3KooWEfPTHZYjdoLhoJiTvan2gUg6jxm7rvcFvtZSsRFHezAo',
      viewingContext: 'purchase',
    });

    expect(order?.total).toBe('0.00029838');
    expect(order?.currency).toBe('BTC');
    expect(order?.pricingCurrency).toBe('ETH');
    expect(formatPaymentAmount(order!.total, order!.paymentCoin, order!.currency)).toBe(
      '0.0002984 BTC'
    );
  });
});
