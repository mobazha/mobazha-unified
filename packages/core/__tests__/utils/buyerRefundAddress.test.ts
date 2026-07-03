import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api/client';
import {
  buyerNeedsRefundAddress,
  isRefundAddressRequiredError,
  resolveBuyerRefundAddress,
  mergeRefundReceivingAddress,
  resolveAccountDefaultRefundAddress,
  shouldShowRefundDestination,
} from '../../utils/buyerRefundAddress';
import type { Order } from '../../types/order';
import type { DisplayOrder } from '../../types/orderDisplay';
import type { PaymentSession } from '../../types/paymentSession';

function buildDisplayOrder(overrides: Partial<DisplayOrder> = {}): DisplayOrder {
  return {
    id: 'order-1',
    orderId: 'order-1',
    status: 'paid',
    items: [],
    total: '1',
    currency: 'ETH',
    createdAt: '2026-01-01T00:00:00Z',
    vendor: { id: 'vendor', name: 'Seller', avatar: '', peerID: 'vendor-peer' },
    shippingAddress: '',
    timeline: [],
    userRole: 'buyer',
    paymentCoin: 'crypto:eip155:1:native',
    ...overrides,
  };
}

function buildCoreOrder(overrides: Partial<Order> = {}): Order {
  return {
    contract: {
      paymentSent: {
        coin: 'crypto:eip155:1:native',
      },
    },
    state: 'AWAITING_SHIPMENT',
    read: false,
    funded: true,
    unreadChatMessages: 0,
    paymentAddressTransactions: [],
    ...overrides,
  };
}

function buildSession(overrides: Partial<PaymentSession> = {}): PaymentSession {
  return {
    sessionID: 's1',
    orderID: 'order-1',
    paymentCoin: 'crypto:eip155:1:native',
    settlementMode: 'address_monitored',
    productMode: 'cancelable',
    status: 'awaiting_funds',
    expectedAmount: '1',
    expiresAt: '',
    fundingTarget: { type: 'address', assetID: 'crypto:eip155:1:native', amount: '1' },
    paymentProgress: {
      observedAmount: '0',
      requiredAmount: '1',
      remainingAmount: '1',
      observationCount: 0,
      fundingState: 'awaiting_funds',
    },
    ...overrides,
  };
}

describe('resolveBuyerRefundAddress', () => {
  it('prefers payment session refund address', () => {
    const coreOrder = buildCoreOrder({
      contract: {
        paymentSent: {
          coin: 'crypto:eip155:1:native',
          refundAddress: '0xlegacy',
        },
      },
    });

    expect(resolveBuyerRefundAddress(coreOrder, buildSession({ refundAddress: '0xsession' }))).toBe(
      '0xsession'
    );
  });

  it('reads contract-level refundAddress from order detail API', () => {
    expect(
      resolveBuyerRefundAddress({
        contract: {
          refundAddress: '0xcontract-refund',
          paymentSent: { coin: 'crypto:eip155:1:native', refundAddress: '0xlegacy' },
        },
        state: 'AWAITING_SHIPMENT',
        read: false,
        funded: true,
        unreadChatMessages: 0,
        paymentAddressTransactions: [],
      })
    ).toBe('0xcontract-refund');
  });
});

describe('resolveAccountDefaultRefundAddress', () => {
  it('returns address for exact coin key', () => {
    expect(
      resolveAccountDefaultRefundAddress(
        { 'crypto:eip155:1:native': '0xdefault' },
        'crypto:eip155:1:native'
      )
    ).toBe('0xdefault');
  });

  it('returns empty when coin is missing', () => {
    expect(
      resolveAccountDefaultRefundAddress(
        { 'crypto:eip155:1:native': '0xdefault' },
        'crypto:bitcoin:mainnet:native'
      )
    ).toBe('');
  });

  it('resolves legacy ticker keys against canonical payment coin', () => {
    expect(resolveAccountDefaultRefundAddress({ ETH: '0xlegacy' }, 'crypto:eip155:1:native')).toBe(
      '0xlegacy'
    );
  });
});

describe('mergeRefundReceivingAddress', () => {
  it('merges coin entry without dropping existing keys', () => {
    expect(
      mergeRefundReceivingAddress(
        { 'crypto:eip155:1:native': '0xexisting' },
        'crypto:bitcoin:mainnet:native',
        'bc1qexample'
      )
    ).toEqual({
      'crypto:eip155:1:native': '0xexisting',
      'crypto:bitcoin:mainnet:native': 'bc1qexample',
    });
  });
});

describe('buyerNeedsRefundAddress', () => {
  it('returns true when session requires buyer refund input', () => {
    expect(
      buyerNeedsRefundAddress({
        displayOrder: buildDisplayOrder(),
        coreOrder: buildCoreOrder(),
        paymentSession: buildSession({ refundRequiresInput: true }),
      })
    ).toBe(true);
  });

  it('returns false when session resolved a refund destination', () => {
    expect(
      buyerNeedsRefundAddress({
        displayOrder: buildDisplayOrder(),
        coreOrder: buildCoreOrder(),
        paymentSession: buildSession({
          refundAddress: '0xpayer',
          refundRequiresInput: false,
        }),
      })
    ).toBe(false);
  });

  it('returns false when refund address is present on contract', () => {
    expect(
      buyerNeedsRefundAddress({
        displayOrder: buildDisplayOrder(),
        coreOrder: buildCoreOrder({
          contract: {
            paymentSent: {
              coin: 'crypto:eip155:1:native',
              refundAddress: '0xbuyer-refund',
            },
          },
        }),
        paymentSession: buildSession(),
      })
    ).toBe(false);
  });

  it('returns false for seller view', () => {
    expect(
      buyerNeedsRefundAddress({
        displayOrder: buildDisplayOrder({ userRole: 'seller' }),
        coreOrder: buildCoreOrder(),
        paymentSession: buildSession({ refundRequiresInput: true }),
      })
    ).toBe(false);
  });

  it('returns false for unpaid awaiting_payment orders', () => {
    expect(
      buyerNeedsRefundAddress({
        displayOrder: buildDisplayOrder({ status: 'awaiting_payment' }),
        coreOrder: buildCoreOrder({
          funded: false,
          contract: {},
          state: 'AWAITING_PAYMENT',
        }),
      })
    ).toBe(false);
  });

  it('does not show a persistent requirement before session marks input as required', () => {
    expect(
      buyerNeedsRefundAddress({
        displayOrder: buildDisplayOrder(),
        coreOrder: buildCoreOrder(),
        paymentSessionKnown: true,
      })
    ).toBe(false);
  });

  it('shows requirement when session is absent after load for funded crypto orders', () => {
    expect(
      buyerNeedsRefundAddress({
        displayOrder: buildDisplayOrder(),
        coreOrder: buildCoreOrder(),
        paymentSession: null,
        paymentSessionKnown: true,
      })
    ).toBe(true);
  });

  it('waits for payment session before showing requirement', () => {
    expect(
      buyerNeedsRefundAddress({
        displayOrder: buildDisplayOrder(),
        coreOrder: buildCoreOrder(),
        paymentSessionKnown: false,
      })
    ).toBe(false);
  });
});

describe('isRefundAddressRequiredError', () => {
  it('detects stable API error code', () => {
    expect(
      isRefundAddressRequiredError(
        new ApiError('refund address is required for crypto orders', 400, 'REFUND_ADDRESS_REQUIRED')
      )
    ).toBe(true);
  });

  it('detects legacy refund address API error messages', () => {
    expect(isRefundAddressRequiredError('refund address is required for crypto orders')).toBe(true);
    expect(isRefundAddressRequiredError('network timeout')).toBe(false);
  });
});

describe('shouldShowRefundDestination', () => {
  it('shows destination when refund address is resolved and input is not required', () => {
    expect(
      shouldShowRefundDestination({
        displayOrder: buildDisplayOrder(),
        coreOrder: buildCoreOrder(),
        paymentSession: buildSession({
          refundAddress: '0xpayer',
          refundRequiresInput: false,
        }),
      })
    ).toBe(true);
  });

  it('hides destination when buyer still needs to provide input', () => {
    expect(
      shouldShowRefundDestination({
        displayOrder: buildDisplayOrder(),
        coreOrder: buildCoreOrder(),
        paymentSession: buildSession({ refundRequiresInput: true }),
      })
    ).toBe(false);
  });
});
