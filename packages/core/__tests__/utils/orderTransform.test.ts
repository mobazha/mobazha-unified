import { describe, expect, it } from 'vitest';

import {
  deriveCancellationContext,
  isRefundSettlementConfirmed,
  transformCoreOrder,
} from '../../utils/transforms/orderTransform';

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

  it('does not infer a canonical coin when backend mislabeled it', () => {
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

    expect(order?.paymentCoin).toBe('USD');
    expect(order?.currency).toBe('USD');
    expect(order?.total).toBe('70226691.76100452');
    expect(order?.paymentAmount).toBe('70226691.76100452');
    expect(order?.chainId).toBeUndefined();
    expect(order?.paymentProgress?.expectedAmountFormatted).toBe('70182005.33');
  });

  it('formats canonical BTC PaymentSent amounts from satoshis without rounding to zero', () => {
    const order = transformCoreOrder(
      {
        ...buildOrder({}),
        state: 'AWAITING_FULFILLMENT',
        contract: {
          ...buildOrder({}).contract,
          orderOpen: {
            ...buildOrder({}).contract.orderOpen,
            pricingCoin: 'crypto:eip155:11155111:native',
            amount: '11000000000000000',
            listings: [
              {
                listing: {
                  slug: 'listing-1',
                  metadata: {
                    pricingCurrency: { code: 'ETH', divisibility: 18 },
                  },
                  item: {
                    title: 'Test Product',
                    price: 10000000000000000,
                    images: [],
                  },
                  vendorID: { peerID: 'vendor-peer', name: 'Vendor' },
                },
              },
            ],
          },
          paymentSent: {
            coin: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
            amount: '29838',
            method: 'CANCELABLE',
            transactionID: 'c858f37b43b443e5caf12986cc64fd4ddcb21ecad2dc4a33a3c62f1adb4d70c5',
            toAddress: 'bcrt1q3gwez4ld5smq9ql44ucyvmrfyhd3ax37rjdz96vy7jzwfk2l380sm5m6cj',
          },
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.paymentCoin).toBe('crypto:bip122:000000000019d6689c085ae165831e93:native');
    expect(order?.currency).toBe('BTC');
    expect(order?.total).toBe('0.00029838');
    expect(order?.paymentAmount).toBe('0.00029838');
  });

  it('formats canonical fiat PaymentSent amounts with fiat divisibility', () => {
    const order = transformCoreOrder(
      {
        ...buildOrder({}),
        state: 'AWAITING_FULFILLMENT',
        contract: {
          ...buildOrder({}).contract,
          paymentSent: {
            coin: 'fiat:stripe:USD',
            amount: '2900',
            method: 'FIAT',
            transactionID: 'pi_3TatACI000000000000GWsq15',
          },
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.paymentCoin).toBe('fiat:stripe:USD');
    expect(order?.currency).toBe('USD');
    expect(order?.total).toBe('29.00');
    expect(order?.paymentAmount).toBe('29.00');
    expect(order?.fiatPayment).toMatchObject({
      provider: 'stripe',
      paymentID: 'pi_3TatACI000000000000GWsq15',
    });
  });

  it('uses OrderOpen pricing coin for unpaid display without inventing paymentCoin', () => {
    const rawOrder = buildOrder({}) as any;
    delete rawOrder.contract.paymentSent;
    rawOrder.state = 'AWAITING_PAYMENT';

    const order = transformCoreOrder(rawOrder, {
      currentUserPeerID: 'buyer-peer',
      viewingContext: 'purchase',
    });

    expect(order?.paymentCoin).toBeUndefined();
    expect(order?.currency).toBe('USD');
    expect(order?.total).toBe('100.00');
    expect(order?.paymentAmount).toBe('100.00');
  });

  it('reads moderated payment method from PaymentSent settlementSpec', () => {
    const rawOrder = buildOrder({}) as any;
    rawOrder.state = 'AWAITING_FULFILLMENT';
    rawOrder.protection = {
      stage: 'ESCROWED',
      daysRemaining: 0,
      extendable: false,
      extended: false,
      afterSaleWindowDays: 7,
    };
    rawOrder.contract.paymentSent = {
      ...rawOrder.contract.paymentSent,
      method: undefined,
      moderator: '12D3KooWModeratorPeerId',
      settlementSpec: {
        method: 'MODERATED',
        payMode: 'address_monitored',
        escrowType: 'managed_escrow',
      },
    };

    const order = transformCoreOrder(rawOrder, {
      currentUserPeerID: 'buyer-peer',
      viewingContext: 'purchase',
    });

    expect(order?.isModerated).toBe(true);
    expect(order?.moderator?.id).toBe('12D3KooWModeratorPeerId');
    expect(order?.protection?.protectionLevel).toBe('full');
  });

  it('exposes backend-submitted settlement mode from PaymentSent settlementSpec', () => {
    const rawOrder = buildOrder({}) as any;
    rawOrder.state = 'AWAITING_FULFILLMENT';
    rawOrder.contract.paymentSent = {
      ...rawOrder.contract.paymentSent,
      method: undefined,
      settlementSpec: {
        method: 'CANCELABLE',
        payMode: 'address_monitored',
        escrowType: 'managed_escrow',
      },
    };

    const order = transformCoreOrder(rawOrder, {
      currentUserPeerID: 'seller-peer',
      viewingContext: 'sale',
    });

    expect(order?.paymentSettlementMode).toBe('address_monitored');
    expect(order?.paymentProductMode).toBe('cancelable');
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

  it('separates payment, release, and completion for cancelable managed orders', () => {
    const order = transformCoreOrder(
      {
        state: 'COMPLETED',
        paymentState: {
          verificationStatus: 'verified',
        },
        settlementActions: [
          {
            settlementAction: 'cancel',
            state: 'confirmed',
          },
          {
            settlementAction: 'confirm',
            state: 'confirmed',
          },
        ],
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
            coin: 'crypto:eip155:11155111:native',
            amount: '33000000000000000',
            method: 'CANCELABLE',
            transactionID: '0xpaytx00000000000000000000000000000000000000000000000000000001',
            timestamp: '2026-05-15T00:02:00Z',
          },
          orderConfirmation: {
            timestamp: '2026-05-15T00:05:00Z',
            transactionID: '0xreleasetx000000000000000000000000000000000000000000000000000001',
          },
          orderComplete: {
            timestamp: '2026-05-15T00:10:00Z',
          },
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.paymentTx).toBe(
      '0xpaytx00000000000000000000000000000000000000000000000000000001'
    );
    expect(order?.releaseTx).toBe(
      '0xreleasetx000000000000000000000000000000000000000000000000000001'
    );
    expect(order?.fundsReleasedAtConfirmation).toBe(true);
    expect(order?.timeline.map(event => [event.status, event.descriptionKey])).toEqual([
      ['created', 'order.timeline.orderPlaced'],
      ['paid', 'order.timeline.paymentConfirmed'],
      ['processing', 'order.timeline.vendorConfirmed'],
      ['released', 'order.timeline.fundsReleased'],
      ['completed', 'order.timeline.orderCompleted'],
    ]);
    expect(order?.timeline.find(event => event.status === 'paid')?.timestamp).toBe(
      '2026-05-15T00:02:00Z'
    );
    expect(order?.timeline.find(event => event.status === 'processing')?.timestamp).toBe(
      '2026-05-15T00:05:00Z'
    );
  });

  it('uses explicit lifecycle timestamps when message timestamps are missing', () => {
    const order = transformCoreOrder(
      {
        ...buildOrder({}),
        state: 'COMPLETED',
        paidAt: '2026-05-30T12:55:44Z',
        shippedAt: '2026-05-30T12:59:45Z',
        completedAt: '2026-05-30T13:00:40Z',
        lastStateChangeAt: '2026-05-30T13:00:40Z',
        contract: {
          ...buildOrder({}).contract,
          paymentSent: {
            coin: 'crypto:bip122:12a765e31ffd4059bada1e25190f6e98:native',
            amount: '95183',
            method: 'CANCELABLE',
            transactionID: 'b0479b51b26baa36ad817134a36b1957cfddba47108dd65b88307a0919d6a201',
          },
          orderConfirmation: {
            timestamp: '2026-05-30T12:59:44Z',
          },
          orderComplete: {},
        },
      } as any,
      { currentUserPeerID: 'vendor-peer', viewingContext: 'sale' }
    );

    expect(order?.timeline.find(event => event.status === 'paid')?.timestamp).toBe(
      '2026-05-30T12:55:44Z'
    );
    expect(order?.timeline.find(event => event.status === 'processing')?.timestamp).toBe(
      '2026-05-30T12:59:44Z'
    );
    expect(order?.timeline.find(event => event.status === 'shipped')?.timestamp).toBe(
      '2026-05-30T12:59:45Z'
    );
    expect(order?.timeline.find(event => event.status === 'completed')?.timestamp).toBe(
      '2026-05-30T13:00:40Z'
    );
  });

  it('uses paidAt to create a paid timeline event without PaymentSent', () => {
    const order = transformCoreOrder(
      {
        ...buildOrder({}),
        state: 'PENDING',
        paidAt: '2026-06-02T09:40:00Z',
        paymentState: {
          verificationStatus: 'verified',
        },
        contract: {
          ...buildOrder({}).contract,
          paymentSent: undefined,
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.paymentTx).toBeUndefined();
    expect(order?.timeline.find(event => event.status === 'paid')).toMatchObject({
      timestamp: '2026-06-02T09:40:00Z',
      descriptionKey: 'order.timeline.paymentConfirmed',
    });
  });

  it('does not treat a confirmed cancel settlement action as seller fund release', () => {
    const order = transformCoreOrder(
      {
        ...buildOrder({}),
        state: 'AWAITING_SHIPMENT',
        protection: {
          stage: 'ESCROWED',
          daysRemaining: 7,
          extendable: true,
          extended: false,
          afterSaleWindowDays: 7,
        },
        settlementActions: [
          {
            settlementAction: 'cancel',
            state: 'confirmed',
            txHash: '0xcanceltx',
          },
        ],
        contract: {
          ...buildOrder({}).contract,
          paymentSent: {
            ...buildOrder({}).contract.paymentSent,
            method: 'CANCELABLE',
          },
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.fundsReleasedAtConfirmation).toBe(false);
    expect(order?.releaseTx).toBeUndefined();
    expect(order?.timeline.some(event => event.status === 'released')).toBe(false);
    expect(order?.protection?.stage).toBe('ESCROWED');
  });

  it('marks funds released when order confirmation carries the release tx even for legacy BTC method values', () => {
    const order = transformCoreOrder(
      {
        ...buildOrder({}),
        state: 'AWAITING_SHIPMENT',
        protection: {
          stage: 'ESCROWED',
          daysRemaining: 7,
          extendable: true,
          extended: false,
          afterSaleWindowDays: 7,
        },
        contract: {
          ...buildOrder({}).contract,
          paymentSent: {
            coin: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
            amount: '29840',
            method: 'DIRECT',
            transactionID: 'c858f37b43b443e5caf12986cc64fd4ddcb21ecad2dc4a33a3c62f1adb4d70c5',
          },
          orderConfirmation: {
            timestamp: '2026-05-24T05:37:00Z',
            transactionID: '92743db043b443e5caf12986cc64fd4ddcb21ecad2dc4a33a3c62f1a15dfc7',
          },
        },
      } as any,
      { currentUserPeerID: 'vendor-peer', viewingContext: 'sale' }
    );

    expect(order?.releaseTx).toBe('92743db043b443e5caf12986cc64fd4ddcb21ecad2dc4a33a3c62f1a15dfc7');
    expect(order?.fundsReleasedAtConfirmation).toBe(true);
    expect(order?.protection).toBeUndefined();
    expect(order?.timeline.some(event => event.status === 'released')).toBe(true);
  });

  it('uses buyer-oriented released timeline copy when dispute refunds buyer', () => {
    const order = transformCoreOrder(
      {
        ...buildOrder({}),
        state: 'COMPLETED',
        completedAt: '2026-06-10T13:41:05Z',
        contract: {
          ...buildOrder({}).contract,
          paymentSent: {
            ...buildOrder({}).contract.paymentSent,
            transactionID: 'paymenttx1234567890abcdef',
          },
          disputeOpen: { timestamp: '2026-06-10T13:37:17Z', reason: 'test dispute' },
          disputeClose: {
            timestamp: '2026-06-10T13:40:25Z',
            verdict: 'Buyer wins',
            releaseInfo: {
              buyerAmount: '100000',
              vendorAmount: '0',
              txid: 'releasetx4567890abcdef',
            },
          },
          disputeAccept: {
            timestamp: '2026-06-10T13:41:05Z',
            closedBy: 'BUYER',
            txid: 'releasetx4567890abcdef',
          },
          orderComplete: {},
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    const released = order?.timeline.find(event => event.status === 'released');
    expect(released?.descriptionKey).toBe('order.timeline.fundsReleasedToBuyer');
    expect(released?.timestamp).toBe('2026-06-10T13:41:05Z');

    const completed = order?.timeline.find(event => event.status === 'completed');
    expect(completed?.timestamp).toBe('2026-06-10T13:41:05Z');
    expect(order?.dispute?.resolvedAt).toBe('2026-06-10T13:40:25Z');
    expect(order?.dispute?.acceptedAt).toBe('2026-06-10T13:41:05Z');
  });

  it('maps nested after-sale dispute payloads from order details', () => {
    const order = transformCoreOrder(
      {
        ...buildOrder({}),
        afterSaleDispute: {
          reason: 'OTHER',
          description: 'Package arrived damaged',
          openedAt: '2026-05-23T00:51:10.835Z',
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.afterSaleDispute).toEqual({
      reason: 'OTHER',
      description: 'Package arrived damaged',
      reportedAt: '2026-05-23T00:51:10.835Z',
    });
  });

  it('maps after-sale dispute payloads nested under contract for current node responses', () => {
    const base = buildOrder({});
    const order = transformCoreOrder(
      {
        ...base,
        contract: {
          ...base.contract,
          afterSaleDispute: {
            reason: 'OTHER',
            description: 'Feedback from buyer',
            openedAt: '2026-05-23T00:51:10.844Z',
          },
        },
      } as any,
      { currentUserPeerID: 'vendor-peer', viewingContext: 'sale' }
    );

    expect(order?.afterSaleDispute).toEqual({
      reason: 'OTHER',
      description: 'Feedback from buyer',
      reportedAt: '2026-05-23T00:51:10.844Z',
    });
  });
});

describe('deriveCancellationContext', () => {
  it('classifies seller decline after payment as seller_decline + funded', () => {
    const ctx = deriveCancellationContext({
      state: 'DECLINED',
      funded: true,
      paymentState: { verificationStatus: 'verified' },
      contract: {
        orderDecline: {
          type: 'USER_DECLINE',
          timestamp: '2026-05-23T04:45:40Z',
        },
        paymentSent: { coin: 'crypto:eip155:1:native' },
      },
    });

    expect(ctx).toEqual({
      kind: 'seller_decline',
      wasFunded: true,
      reason: undefined,
      refundConfirmed: false,
    });
  });

  it('marks refundConfirmed when settlement cancel is confirmed on-chain', () => {
    const ctx = deriveCancellationContext({
      state: 'DECLINED',
      funded: true,
      paymentState: { verificationStatus: 'verified' },
      settlementActions: [
        {
          action: 'cancel',
          settlementAction: 'cancel',
          state: 'confirmed',
        },
      ],
      contract: {
        orderDecline: {
          type: 'USER_DECLINE',
          timestamp: '2026-05-23T04:45:40Z',
          transactionID: '0xfailedattempt',
        },
        paymentSent: { coin: 'crypto:eip155:1:native' },
      },
    });

    expect(ctx?.refundConfirmed).toBe(true);
  });

  it('does not treat orderDecline tx as refund when settlement actions exist but cancel pending', () => {
    expect(
      isRefundSettlementConfirmed([{ action: 'cancel', state: 'pending' }], {
        orderDecline: { transactionID: '0xfailedattempt' },
      })
    ).toBe(false);
  });

  it('classifies system payment timeout from orderCancel.reason', () => {
    const ctx = deriveCancellationContext({
      state: 'CANCELED',
      funded: false,
      contract: {
        orderCancel: { reason: 'payment_timeout', timestamp: '2026-05-23T04:00:00Z' },
      },
    });

    expect(ctx).toEqual({
      kind: 'payment_timeout',
      wasFunded: false,
      reason: 'payment_timeout',
      refundConfirmed: false,
    });
  });

  it('classifies funded manual cancel without reason as cancelled_paid', () => {
    const ctx = deriveCancellationContext({
      state: 'CANCELED',
      funded: true,
      contract: {
        orderCancel: { timestamp: '2026-05-23T04:00:00Z' },
        paymentSent: { coin: 'crypto:eip155:1:native' },
      },
    });

    expect(ctx?.kind).toBe('cancelled_paid');
    expect(ctx?.wasFunded).toBe(true);
  });
});

describe('transformCoreOrder cancellation display', () => {
  const baseOpenContract = {
    OrderID: 'order-declined-1',
    orderOpen: {
      timestamp: '2026-05-23T04:22:58Z',
      pricingCoin: 'USD',
      amount: 1500,
      buyerID: { peerID: 'buyer-peer', name: 'Buyer' },
      listings: [
        {
          listing: {
            slug: 'listing-1',
            metadata: { pricingCurrency: { code: 'USD', divisibility: 2 } },
            item: { title: 'Test Product', price: 1500, images: [] },
            vendorID: { peerID: 'vendor-peer', name: 'Vendor' },
          },
        },
      ],
      items: [{ quantity: 1 }],
      shipping: {},
    },
  };

  it('surfaces seller decline context for buyer view', () => {
    const order = transformCoreOrder(
      {
        state: 'DECLINED',
        funded: true,
        paymentState: {
          verificationStatus: 'verified',
          progress: { percentage: 100 },
        },
        contract: {
          ...baseOpenContract,
          orderDecline: {
            reason: 'Out of stock',
            timestamp: '2026-05-23T04:45:40Z',
            type: 'USER_DECLINE',
          },
          paymentSent: { coin: 'crypto:eip155:1:native', amount: '21000000000000000' },
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.status).toBe('cancelled');
    expect(order?.cancellation).toMatchObject({
      kind: 'seller_decline',
      wasFunded: true,
      reason: 'Out of stock',
      refundConfirmed: false,
    });
    expect(order?.cancelReason).toBe('Out of stock');
    expect(order?.cancelledAt).toBe('2026-05-23T04:45:40Z');
    expect(order?.timeline.some(e => e.descriptionKey === 'order.timeline.orderDeclined')).toBe(
      true
    );
  });

  it('marks refund confirmed when settlement cancel is on-chain', () => {
    const order = transformCoreOrder(
      {
        state: 'DECLINED',
        funded: true,
        paymentState: {
          verificationStatus: 'verified',
          progress: { percentage: 100 },
        },
        settlementActions: [
          {
            action: 'cancel',
            settlementAction: 'cancel',
            state: 'confirmed',
          },
        ],
        contract: {
          ...baseOpenContract,
          orderDecline: {
            reason: 'Out of stock',
            timestamp: '2026-05-23T04:45:40Z',
            type: 'USER_DECLINE',
          },
          paymentSent: { coin: 'crypto:eip155:1:native', amount: '21000000000000000' },
        },
      } as any,
      { currentUserPeerID: 'buyer-peer', viewingContext: 'purchase' }
    );

    expect(order?.cancellation?.refundConfirmed).toBe(true);
  });

  it('maps disputeOpen.reason and evidenceHashes into display dispute', () => {
    const rawOrder = {
      ...buildOrder({}),
      state: 'DISPUTED',
      contract: {
        ...buildOrder({}).contract,
        disputeOpen: {
          timestamp: '2026-06-03T12:00:00Z',
          reason: 'Product not as described',
          evidenceHashes: ['QmEvidenceA', 'QmEvidenceB'],
          openedBy: 'BUYER',
        },
      },
    } as any;

    const order = transformCoreOrder(rawOrder, {
      currentUserPeerID: 'buyer-peer',
      viewingContext: 'purchase',
    });

    expect(order?.dispute?.claim).toBe('Product not as described');
    expect(order?.dispute?.evidenceHashes).toEqual(['QmEvidenceA', 'QmEvidenceB']);
    expect(order?.dispute?.initiator).toBe('buyer');
  });

  it('maps disputeClose releaseInfo into resolution outcome and explanation text', () => {
    const rawOrder = {
      ...buildOrder({}),
      state: 'DECIDED',
      contract: {
        ...buildOrder({}).contract,
        disputeOpen: {
          timestamp: '2026-06-03T12:00:00Z',
          reason: 'test dispute',
          openedBy: 'BUYER',
        },
        disputeClose: {
          timestamp: '2026-06-03T15:50:00Z',
          verdict: 'Buyer receives 60% because delivery was incomplete.',
          releaseInfo: {
            buyerAmount: '6000000000000000',
            vendorAmount: '4000000000000000',
            moderatorAmount: '0',
          },
        },
      },
    } as any;

    const order = transformCoreOrder(rawOrder, {
      currentUserPeerID: 'buyer-peer',
      viewingContext: 'purchase',
    });

    expect(order?.dispute?.status).toBe('resolved');
    expect(order?.dispute?.resolution).toBe('split');
    expect(order?.dispute?.buyerPayoutPercent).toBe(60);
    expect(order?.dispute?.vendorPayoutPercent).toBe(40);
    expect(order?.dispute?.buyerPayoutAmount).toBe('0.006 ETH');
    expect(order?.dispute?.vendorPayoutAmount).toBe('0.004 ETH');
    expect(order?.dispute?.moderatorPayoutAmount).toBe('0 ETH');
    expect(order?.dispute?.resolutionText).toBe(
      'Buyer receives 60% because delivery was incomplete.'
    );
  });

  it('derives payout percentages that sum to 100', () => {
    const rawOrder = {
      ...buildOrder({}),
      state: 'DECIDED',
      contract: {
        ...buildOrder({}).contract,
        disputeOpen: { timestamp: '2026-06-03T12:00:00Z', reason: 'test', openedBy: 'BUYER' },
        disputeClose: {
          timestamp: '2026-06-03T15:50:00Z',
          verdict: 'Split three ways approximated.',
          releaseInfo: { buyerAmount: '1', vendorAmount: '2' },
        },
      },
    } as any;

    const order = transformCoreOrder(rawOrder, {
      currentUserPeerID: 'buyer-peer',
      viewingContext: 'purchase',
    });

    expect(order?.dispute?.buyerPayoutPercent).toBe(33);
    expect(order?.dispute?.vendorPayoutPercent).toBe(67);
  });

  it('maps DECIDED and disputeClose to display status decided', () => {
    const rawOrder = {
      ...buildOrder({}),
      state: 'DECIDED',
      contract: {
        ...buildOrder({}).contract,
        disputeOpen: { timestamp: '2026-06-03T12:00:00Z', reason: 'test', openedBy: 'BUYER' },
        disputeClose: {
          timestamp: '2026-06-03T15:50:00Z',
          verdict: 'Full refund to buyer.',
          releaseInfo: { buyerAmount: '100', vendorAmount: '0' },
        },
      },
    } as any;

    const order = transformCoreOrder(rawOrder, {
      currentUserPeerID: 'buyer-peer',
      viewingContext: 'purchase',
    });

    expect(order?.status).toBe('decided');
  });

  it('promotes disputed display status to decided when disputeClose exists', () => {
    const rawOrder = {
      ...buildOrder({}),
      state: 'DISPUTED',
      contract: {
        ...buildOrder({}).contract,
        disputeOpen: { timestamp: '2026-06-03T12:00:00Z', reason: 'test', openedBy: 'BUYER' },
        disputeClose: {
          timestamp: '2026-06-03T15:50:00Z',
          verdict: 'Seller keeps funds.',
          releaseInfo: { buyerAmount: '0', vendorAmount: '100' },
        },
      },
    } as any;

    const order = transformCoreOrder(rawOrder, {
      currentUserPeerID: 'buyer-peer',
      viewingContext: 'purchase',
    });

    expect(order?.status).toBe('decided');
  });
});
