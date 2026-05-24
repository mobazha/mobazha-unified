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

  it('does not guess a canonical coin when payment-session is mislabeled', () => {
    const order = buildDisplayOrder();
    order.paymentTx = '0x269fffe47a2b1cd4ade027d4d5a70a377434156e4c2179cd87ec389630403d30';

    const session = buildPaymentSession();
    session.paymentCoin = 'USD';
    session.expectedAmount = '0.007022669176100452';
    session.fundingTarget.assetID = 'USD';
    session.fundingTarget.amount = '0.007022669176100452';

    const result = applyPaymentSessionToDisplayOrder(order, session);

    expect(result.paymentCoin).toBe('USD');
    expect(result.currency).toBe('USD');
    expect(result.total).toBe('70226691761004.52');
    expect(result.paymentAmount).toBe('70226691761004.52');
    expect(result.chainId).toBeUndefined();
  });

  it('does not clobber contract total when session observedAmount is zero', () => {
    const order = buildDisplayOrder();
    order.total = '0.00029838';
    order.currency = 'BTC';
    order.paymentCoin = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
    order.paymentAmount = '0.00029838';

    const session = buildPaymentSession();
    session.paymentCoin = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
    session.expectedAmount = '29838';
    session.fundingTarget.assetID = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
    session.fundingTarget.amount = '29838';
    session.paymentProgress = {
      observedAmount: '0',
      requiredAmount: '29838',
      remainingAmount: '29838',
      observationCount: 0,
      fundingState: 'pending',
    };

    const result = applyPaymentSessionToDisplayOrder(order, session);

    expect(result.total).toBe('0.00029838');
    expect(result.paymentAmount).toBe('0.00029838');
  });

  it('converts UTXO minimal-unit session amounts to standard units', () => {
    const order = buildDisplayOrder();
    order.total = '0.01';
    order.currency = 'ETH';

    const session = buildPaymentSession();
    session.paymentCoin = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
    session.expectedAmount = '29838';
    session.fundingTarget.assetID = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
    session.fundingTarget.amount = '29838';
    session.paymentProgress = {
      observedAmount: '29838',
      requiredAmount: '29838',
      remainingAmount: '0',
      observationCount: 1,
      fundingState: 'funded',
    };

    const result = applyPaymentSessionToDisplayOrder(order, session);

    expect(result.currency).toBe('BTC');
    expect(result.total).toBe('0.00029838');
    expect(result.paymentAmount).toBe('0.00029838');
  });

  it('does not overwrite canonical paid order amounts with session fallbacks', () => {
    const order = buildDisplayOrder();
    order.total = '0.00029838';
    order.currency = 'BTC';
    order.paymentCoin = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
    order.paymentAmount = '0.00029838';
    order.paymentTx = 'btc-tx-1';

    const session = buildPaymentSession();
    session.paymentCoin = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
    session.expectedAmount = '110000000';
    session.fundingTarget.assetID = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
    session.fundingTarget.amount = '110000000';
    session.paymentProgress = {
      observedAmount: '0',
      requiredAmount: '110000000',
      remainingAmount: '110000000',
      observationCount: 0,
      fundingState: 'awaiting_funds',
    };

    const result = applyPaymentSessionToDisplayOrder(order, session);

    expect(result.currency).toBe('BTC');
    expect(result.total).toBe('0.00029838');
    expect(result.paymentAmount).toBe('0.00029838');
  });
});
