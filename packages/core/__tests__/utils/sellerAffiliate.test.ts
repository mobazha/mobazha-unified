// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorTracker } from '../../services/monitoring/errorTracker';
import {
  deriveSellerAffiliateDisplayStatus,
  groupSellerAffiliateStatementLines,
  normalizeSellerAffiliateStatementLine,
} from '../../utils/sellerAffiliate';
import type { SellerAffiliateStatementLine } from '../../types/sellerAffiliate';

function statement(
  settlementState?: 'planned' | 'submitted' | 'confirmed',
  status: string = 'pending'
): SellerAffiliateStatementLine {
  return normalizeSellerAffiliateStatementLine({
    attribution: {
      id: 'attribution-1',
      orderID: 'order-1',
      referralSessionID: 'referral-1',
      programID: 'program-1',
      sellerPeerID: 'seller-1',
      buyerKind: 'peer',
      buyerPeerID: 'buyer-1',
      promoterPeerID: 'promoter-1',
      commissionRateBPSSnapshot: 1000,
      attributedAt: '2026-07-11T00:00:00Z',
    },
    commissionLine: {
      attributionID: 'attribution-1',
      orderID: 'order-1',
      orderLineID: 'line-1',
      netMerchandiseAtomic: '1000',
      commissionAtomic: '100',
      currency: 'crypto:eip155:1:native',
      status,
    },
    ...(settlementState
      ? {
          settlement: {
            actionId: 'action-1',
            action: 'complete',
            state: settlementState,
            txHash: '0xtx',
            coin: 'crypto:eip155:1:native',
            amount: '100',
            address: '0x1111111111111111111111111111111111111111',
            confirmations: 3,
            updatedAt: '2026-07-11T01:00:00Z',
          },
        }
      : {}),
  });
}

describe('seller affiliate statement status', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [undefined, 'pending'],
    ['planned', 'settling'],
    ['submitted', 'settling'],
    ['confirmed', 'paid'],
  ] as const)('derives %s settlement as %s', (settlementState, expected) => {
    expect(deriveSellerAffiliateDisplayStatus(statement(settlementState))).toBe(expected);
  });

  it('treats an irreversible confirmed on-chain output as paid even if the commission line was reversed', () => {
    expect(deriveSellerAffiliateDisplayStatus(statement('confirmed', 'reversed'))).toBe('paid');
  });

  it('reports a contract anomaly when confirmed settlement contradicts a reversed commission line', () => {
    const captureMessage = vi.spyOn(errorTracker, 'captureMessage');

    deriveSellerAffiliateDisplayStatus(statement('confirmed', 'reversed'));

    expect(captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('confirmed_settlement_with_reversed_commission'),
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('does not report an anomaly for consistent confirmed/pending states', () => {
    const captureMessage = vi.spyOn(errorTracker, 'captureMessage');

    deriveSellerAffiliateDisplayStatus(statement('confirmed'));
    deriveSellerAffiliateDisplayStatus(statement(undefined, 'reversed'));

    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('rejects the removed earned commission state', () => {
    expect(() => statement(undefined, 'earned')).toThrow(
      'Invalid seller affiliate commission status'
    );
  });

  it('accepts Guest attribution without exposing a buyer peer ID', () => {
    const normalized = normalizeSellerAffiliateStatementLine({
      attribution: {
        id: 'attribution-guest',
        orderID: 'gst_order_1',
        referralSessionID: 'referral-1',
        programID: 'program-1',
        sellerPeerID: 'seller-1',
        buyerKind: 'guest',
        promoterPeerID: 'promoter-1',
        commissionRateBPSSnapshot: 1000,
        attributedAt: '2026-07-11T00:00:00Z',
      },
      commissionLine: {
        attributionID: 'attribution-guest',
        orderID: 'gst_order_1',
        orderLineID: 'gst_order_1:0',
        netMerchandiseAtomic: '1000',
        commissionAtomic: '100',
        currency: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
        status: 'pending',
      },
    });

    expect(normalized.attribution.buyerKind).toBe('guest');
    expect(normalized.attribution.buyerPeerID).toBeUndefined();
  });

  it('rejects a Guest attribution that leaks a peer buyer identity', () => {
    expect(() =>
      normalizeSellerAffiliateStatementLine({
        attribution: {
          id: 'attribution-guest',
          orderID: 'gst_order_1',
          referralSessionID: 'referral-1',
          programID: 'program-1',
          sellerPeerID: 'seller-1',
          buyerKind: 'guest',
          buyerPeerID: 'unexpected-peer',
          promoterPeerID: 'promoter-1',
          commissionRateBPSSnapshot: 1000,
          attributedAt: '2026-07-11T00:00:00Z',
        },
        commissionLine: {
          attributionID: 'attribution-guest',
          orderID: 'gst_order_1',
          orderLineID: 'gst_order_1:0',
          netMerchandiseAtomic: '1000',
          commissionAtomic: '100',
          currency: 'BTC',
          status: 'pending',
        },
      })
    ).toThrow('Invalid seller affiliate buyer identity');
  });

  it('rejects a peer attribution without a buyer peer ID', () => {
    expect(() =>
      normalizeSellerAffiliateStatementLine({
        attribution: {
          id: 'attribution-peer',
          orderID: 'order-1',
          referralSessionID: 'referral-1',
          programID: 'program-1',
          sellerPeerID: 'seller-1',
          buyerKind: 'peer',
          promoterPeerID: 'promoter-1',
          commissionRateBPSSnapshot: 1000,
          attributedAt: '2026-07-11T00:00:00Z',
        },
        commissionLine: {
          attributionID: 'attribution-peer',
          orderID: 'order-1',
          orderLineID: 'order-1:0',
          netMerchandiseAtomic: '1000',
          commissionAtomic: '100',
          currency: 'BTC',
          status: 'pending',
        },
      })
    ).toThrow('Invalid seller affiliate buyer identity');
  });
});

interface LineOverrides {
  orderID?: string;
  orderLineID?: string;
  currency?: string;
  commissionAtomic?: string;
  status?: string;
  settlement?: {
    actionId?: string;
    state?: 'planned' | 'submitted' | 'confirmed';
    txHash?: string;
    updatedAt?: string;
  } | null;
}

function line(overrides: LineOverrides = {}): SellerAffiliateStatementLine {
  const orderID = overrides.orderID ?? 'order-1';
  const currency = overrides.currency ?? 'crypto:eip155:1:native';
  const settlement = overrides.settlement;
  return normalizeSellerAffiliateStatementLine({
    attribution: {
      id: `attribution-${overrides.orderLineID ?? 'line-1'}`,
      orderID,
      referralSessionID: 'referral-1',
      programID: 'program-1',
      sellerPeerID: 'seller-1',
      buyerKind: 'peer',
      buyerPeerID: 'buyer-1',
      promoterPeerID: 'promoter-1',
      commissionRateBPSSnapshot: 1000,
      attributedAt: '2026-07-11T00:00:00Z',
    },
    commissionLine: {
      attributionID: `attribution-${overrides.orderLineID ?? 'line-1'}`,
      orderID,
      orderLineID: overrides.orderLineID ?? 'line-1',
      netMerchandiseAtomic: '1000',
      commissionAtomic: overrides.commissionAtomic ?? '100',
      currency,
      status: overrides.status ?? 'pending',
    },
    ...(settlement
      ? {
          settlement: {
            actionId: settlement.actionId ?? 'action-1',
            action: 'complete',
            state: settlement.state ?? 'confirmed',
            txHash: settlement.txHash ?? '0xtx',
            coin: currency,
            amount: '100',
            address: '0x1111111111111111111111111111111111111111',
            confirmations: 3,
            updatedAt: settlement.updatedAt ?? '2026-07-11T01:00:00Z',
          },
        }
      : {}),
  });
}

describe('groupSellerAffiliateStatementLines', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sums commission across lines of the same order and currency using BigInt precision', () => {
    const lines = [
      line({ orderLineID: 'line-1', commissionAtomic: '9007199254740992' }),
      line({ orderLineID: 'line-2', commissionAtomic: '9007199254740992' }),
    ];

    const [group] = groupSellerAffiliateStatementLines(lines);

    expect(group.commissionAtomic).toBe('18014398509481984');
  });

  it('shows the settlement once per order instead of once per line', () => {
    const lines = [
      line({ orderLineID: 'line-1', settlement: { state: 'confirmed' } }),
      line({ orderLineID: 'line-2', settlement: { state: 'confirmed' } }),
    ];

    const groups = groupSellerAffiliateStatementLines(lines);

    expect(groups).toHaveLength(1);
    expect(groups[0].settlement?.txHash).toBe('0xtx');
    expect(groups[0].lines).toHaveLength(2);
  });

  it('does not aggregate across currencies for the same order', () => {
    const lines = [
      line({ currency: 'crypto:eip155:1:native' }),
      line({ currency: 'crypto:bip122:000000000019d6689c085ae165831e93:native' }),
    ];

    expect(groupSellerAffiliateStatementLines(lines)).toHaveLength(2);
  });

  it('treats any confirmed line in the group as paid', () => {
    const lines = [
      line({ orderLineID: 'line-1', settlement: { state: 'confirmed' } }),
      line({ orderLineID: 'line-2', settlement: { state: 'planned' } }),
    ];

    expect(groupSellerAffiliateStatementLines(lines)[0].displayStatus).toBe('paid');
  });

  it('is reversed only when every line in the group is reversed', () => {
    const lines = [
      line({ orderLineID: 'line-1', status: 'reversed' }),
      line({ orderLineID: 'line-2', status: 'reversed' }),
    ];

    expect(groupSellerAffiliateStatementLines(lines)[0].displayStatus).toBe('reversed');
  });

  it('reports a contract anomaly and falls back to the active lines when the order has mixed reversed/active lines', () => {
    const captureMessage = vi.spyOn(errorTracker, 'captureMessage');
    const lines = [
      line({ orderLineID: 'line-1', status: 'reversed' }),
      line({ orderLineID: 'line-2', status: 'pending', settlement: { state: 'submitted' } }),
    ];

    const [group] = groupSellerAffiliateStatementLines(lines);

    expect(group.displayStatus).toBe('settling');
    expect(captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('mixed_reversed_and_active_commission_lines_for_order'),
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('picks the most advanced settlement state as the representative settlement', () => {
    const lines = [
      line({
        orderLineID: 'line-1',
        settlement: { actionId: 'action-1', state: 'planned', txHash: undefined },
      }),
      line({ orderLineID: 'line-2', settlement: { actionId: 'action-2', state: 'confirmed' } }),
    ];

    expect(groupSellerAffiliateStatementLines(lines)[0].settlement?.actionID).toBe('action-2');
  });
});
