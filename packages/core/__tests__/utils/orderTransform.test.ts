import { describe, expect, it } from 'vitest';

import { transformCoreOrder } from '../../utils/transforms/orderTransform';

function buildOrder(progress: {
  totalReceived?: string;
  expectedAmount?: string;
  percentage?: number;
  overpaidAmount?: string;
}) {
  return {
    state: 'AWAITING_PAYMENT_VERIFICATION',
    paymentState: {
      progress,
    },
    contract: {
      OrderID: 'order-1',
      orderOpen: {
        timestamp: '2026-05-15T00:00:00Z',
        pricingCoin: 'USD',
        amount: 10000,
        buyerID: { peerID: 'buyer-peer', name: 'Buyer' },
        listings: [
          {
            listing: {
              slug: 'listing-1',
              metadata: {
                pricingCurrency: { code: 'USD', divisibility: 2 },
              },
              item: {
                title: 'Test Product',
                price: 10000,
                images: [],
              },
              vendorID: { peerID: 'vendor-peer', name: 'Vendor' },
            },
          },
        ],
        items: [{ quantity: 1 }],
        shipping: {},
      },
      paymentSent: {
        coin: 'crypto:eip155:1:native',
        amount: 2000000000000000000,
        method: 1,
        transactionID: '0xtx',
      },
    },
  } as any;
}

describe('transformCoreOrder payment progress formatting', () => {
  it('formats large EVM minimal-unit strings without Number precision loss', () => {
    const order = transformCoreOrder(
      buildOrder({
        totalReceived: '1234567890123456789',
        expectedAmount: '2000000000000000000',
        percentage: 61.7,
        overpaidAmount: '100000000000000000',
      }),
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.paymentProgress).toMatchObject({
      totalReceived: '1234567890123456789',
      expectedAmount: '2000000000000000000',
      percentage: 61,
      overpaidAmount: '100000000000000000',
      totalReceivedFormatted: '1.23',
      expectedAmountFormatted: '2.00',
      overpaidAmountFormatted: '0.1000',
    });
  });

  it('keeps tiny values visible by increasing decimals to significant digits', () => {
    const order = transformCoreOrder(
      buildOrder({
        totalReceived: '1',
        expectedAmount: '2000000000000000000',
        percentage: 0.001,
      }),
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.paymentProgress?.totalReceivedFormatted).toBe('0.000000000000000001');
    expect(order?.paymentProgress?.percentage).toBe(0);
  });

  it('omits formatted values for malformed backend amount strings', () => {
    const order = transformCoreOrder(
      buildOrder({
        totalReceived: 'not-a-number',
        expectedAmount: '2000000000000000000',
        percentage: 150,
      }),
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.paymentProgress?.totalReceivedFormatted).toBeUndefined();
    expect(order?.paymentProgress?.expectedAmountFormatted).toBe('2.00');
    expect(order?.paymentProgress?.percentage).toBe(100);
  });

  it('recovers EVM native payment coin when backend mislabeled it as USD', () => {
    const order = transformCoreOrder(
      {
        state: 'PENDING',
        paymentState: {
          verificationStatus: 'verified',
          progress: {
            totalReceived: '7022669176100452',
            expectedAmount: '7018200533383240',
            percentage: 100,
          },
        },
        contract: {
          OrderID: 'order-1',
          orderOpen: {
            timestamp: '2026-05-15T00:00:00Z',
            pricingCoin: 'USD',
            amount: 1500,
            buyerID: { peerID: 'buyer-peer', name: 'Buyer' },
            listings: [
              {
                listing: {
                  slug: 'listing-1',
                  metadata: {
                    pricingCurrency: { code: 'USD', divisibility: 2 },
                  },
                  item: {
                    title: 'Test Product',
                    price: 1500,
                    images: [],
                  },
                  vendorID: { peerID: 'vendor-peer', name: 'Vendor' },
                },
              },
            ],
            items: [{ quantity: 1 }],
            shipping: {},
          },
          paymentSent: {
            coin: 'USD',
            amount: 7022669176100452,
            method: 'CANCELABLE',
            transactionID: '0x269fffe47a2b1cd4ade027d4d5a70a377434156e4c2179cd87ec389630403d30',
            toAddress: '0xeb5Ad81338D6AEc8EBC89e681275630dC4A914BE',
            contractAddress: '0xeb5Ad81338D6AEc8EBC89e681275630dC4A914BE',
          },
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.paymentCoin).toBe('crypto:eip155:11155111:native');
    expect(order?.currency).toBe('ETH');
    expect(order?.total).toBe('0.007022669176100452');
    expect(order?.paymentAmount).toBe('0.007022669176100452');
    expect(order?.chainId).toBe(11155111);
    expect(order?.paymentProgress?.expectedAmountFormatted).toBe('0.007018');
  });

  it('exposes manual digital delivery details from order shipments', () => {
    const order = transformCoreOrder(
      {
        ...buildOrder({}),
        state: 'SHIPPED',
        contract: {
          ...buildOrder({}).contract,
          orderOpen: {
            ...buildOrder({}).contract.orderOpen,
            listings: [
              {
                listing: {
                  slug: 'listing-1',
                  metadata: {
                    contractType: 'DIGITAL_GOOD',
                    pricingCurrency: { code: 'USD', divisibility: 2 },
                  },
                  item: {
                    title: 'Digital Product',
                    price: 10000,
                    images: [],
                  },
                  vendorID: { peerID: 'vendor-peer', name: 'Vendor' },
                },
              },
            ],
          },
          orderConfirmation: {
            timestamp: '2026-05-15T00:05:00Z',
          },
          orderShipments: [
            {
              timestamp: '2026-05-15T00:10:00Z',
              shipments: [
                {
                  itemIndex: 0,
                  digitalDelivery: {
                    url: 'https://example.com/download',
                    password: 'secret',
                  },
                  note: 'Use this link within 7 days.',
                },
              ],
            },
          ],
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.shipments).toEqual([
      {
        type: 'digital',
        timestamp: '2026-05-15T00:10:00Z',
        itemIndex: 0,
        fileUrl: 'https://example.com/download',
        password: 'secret',
        note: 'Use this link within 7 days.',
      },
    ]);
  });
});
