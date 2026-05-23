import { describe, expect, it } from 'vitest';

import {
  applyPaymentSessionToDisplayOrder,
  isDirectPaymentOrder,
} from '../../utils/transforms/paymentSessionDisplay';
import type { DisplayOrder } from '../../types/orderDisplay';
import type { PaymentSession } from '../../types/paymentSession';

function buildDisplayOrder(): DisplayOrder {
  return {
    id: 'order-1',
    orderId: 'order-1',
    status: 'paid',
    items: [],
    total: '70226691761004.52',
    currency: 'USD',
    pricingAmount: '15.00',
    pricingCurrency: 'USD',
    paymentCoin: 'USD',
    paymentAmount: '70226691761004.52',
    createdAt: '2026-05-19T06:59:00Z',
    vendor: { id: 'vendor', name: 'Vendor', avatar: '' },
    buyer: { id: 'buyer', name: 'Buyer', avatar: '' },
    shippingAddress: '',
    timeline: [{ status: 'paid', timestamp: '2026-05-19T06:59:00Z', description: 'Paid' }],
    userRole: 'buyer',
    paymentTx: '0xtx',
  };
}

function buildPaymentSession(): PaymentSession {
  return {
    sessionID: 'ps_order-1',
    orderID: 'order-1',
    paymentCoin: 'crypto:eip155:11155111:native',
    settlementMode: 'address_monitored',
    productMode: 'cancelable',
    status: 'verified',
    expectedAmount: '0.007022669176100452',
    expiresAt: '2026-05-20T00:00:00Z',
    fundingTarget: {
      type: 'address',
      address: '0xeb5Ad81338D6AEc8EBC89e681275630dC4A914BE',
      assetID: 'crypto:eip155:11155111:native',
      amount: '0.007022669176100452',
    },
    paymentProgress: {
      observedAmount: '0.007022669176100452',
      requiredAmount: '0.00701820053338324',
      remainingAmount: '0',
      observationCount: 1,
      fundingState: 'overfunded',
    },
  };
}

describe('isDirectPaymentOrder', () => {
  it('prefers payment session product mode when set', () => {
    expect(isDirectPaymentOrder({ paymentProductMode: 'direct' })).toBe(true);
    expect(isDirectPaymentOrder({ paymentProductMode: 'moderated' })).toBe(false);
    expect(isDirectPaymentOrder({ paymentProductMode: 'cancelable' })).toBe(false);
  });

  it('falls back to absence of moderator when payment session is unavailable', () => {
    expect(isDirectPaymentOrder({})).toBe(true);
    expect(
      isDirectPaymentOrder({
        moderator: { id: 'mod', name: 'Mod', avatar: '', fee: 1 },
      })
    ).toBe(false);
  });

  it('uses session product mode over moderator fallback when both are present', () => {
    expect(
      isDirectPaymentOrder({
        paymentProductMode: 'direct',
        moderator: { id: 'mod', name: 'Mod', avatar: '', fee: 1 },
      })
    ).toBe(true);
    expect(
      isDirectPaymentOrder({
        paymentProductMode: 'moderated',
      })
    ).toBe(false);
  });
});

describe('applyPaymentSessionToDisplayOrder', () => {
  it('prefers canonical payment session coin and keeps decimal chain amounts', () => {
    const result = applyPaymentSessionToDisplayOrder(buildDisplayOrder(), buildPaymentSession());

    expect(result.paymentCoin).toBe('crypto:eip155:11155111:native');
    expect(result.currency).toBe('ETH');
    expect(result.total).toBe('0.007022669176100452');
    expect(result.paymentAmount).toBe('0.007022669176100452');
    expect(result.escrowAddress).toBe('0xeb5Ad81338D6AEc8EBC89e681275630dC4A914BE');
    expect(result.paymentSettlementMode).toBe('address_monitored');
    expect(result.paymentProductMode).toBe('cancelable');
  });

  it('falls back to funding target asset id when paymentCoin is absent', () => {
    const session = buildPaymentSession();
    session.paymentCoin = '';

    const result = applyPaymentSessionToDisplayOrder(buildDisplayOrder(), session);

    expect(result.paymentCoin).toBe('crypto:eip155:11155111:native');
    expect(result.currency).toBe('ETH');
    expect(result.paymentAmount).toBe('0.007022669176100452');
  });

  it('recovers EVM native payment when payment-session is mislabeled as USD', () => {
    const order = buildDisplayOrder();
    order.paymentTx = '0x269fffe47a2b1cd4ade027d4d5a70a377434156e4c2179cd87ec389630403d30';

    const session = buildPaymentSession();
    session.paymentCoin = 'USD';
    session.expectedAmount = '0.007022669176100452';
    session.fundingTarget.assetID = 'USD';
    session.fundingTarget.amount = '0.007022669176100452';

    const result = applyPaymentSessionToDisplayOrder(order, session);

    expect(result.paymentCoin).toBe('crypto:eip155:11155111:native');
    expect(result.currency).toBe('ETH');
    expect(result.total).toBe('0.007022669176100452');
    expect(result.paymentAmount).toBe('0.007022669176100452');
    expect(result.chainId).toBe(11155111);
  });
});
