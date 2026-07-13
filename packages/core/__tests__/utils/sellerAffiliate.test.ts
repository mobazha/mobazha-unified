// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorTracker } from '../../services/monitoring/errorTracker';
import {
  deriveSellerAffiliateDisplayStatus,
  groupSellerAffiliateStatementLines,
  normalizeSellerAffiliateCapabilities,
  normalizeSellerAffiliateStatementLine,
  normalizeSellerAffiliateStatementPage,
  summarizeSellerAffiliateEarnings,
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

describe('seller affiliate hosting envelopes', () => {
  it('normalizes the effective rail capability envelope', () => {
    expect(
      normalizeSellerAffiliateCapabilities({
        data: {
          version: 2,
          rails: [
            {
              railID: 'crypto:eip155:56:erc20:0x55d398326f99059fF775485246999027B3197955',
              assetScope: 'exact',
              orderKinds: ['standard', 'guest'],
              actions: ['complete', 'guest_affiliate_transfer'],
              guestSupport: true,
            },
          ],
        },
      })
    ).toEqual({
      version: 2,
      rails: [
        {
          railID: 'crypto:eip155:56:erc20:0x55d398326f99059fF775485246999027B3197955',
          assetScope: 'exact',
          orderKinds: ['standard', 'guest'],
          actions: ['complete', 'guest_affiliate_transfer'],
          guestSupport: true,
        },
      ],
    });
  });

  it('preserves partial-source metadata alongside valid statement lines', () => {
    expect(
      normalizeSellerAffiliateStatementPage({
        data: {
          items: [statement()],
          page: 2,
          pageSize: 20,
          total: 21,
          partial: true,
          sourceErrors: [{ linkID: 'link-2', code: 'seller_unavailable' }],
        },
      })
    ).toMatchObject({
      page: 2,
      pageSize: 20,
      total: 21,
      partial: true,
      sourceErrors: [{ linkID: 'link-2', code: 'seller_unavailable' }],
    });
  });
});

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

  it('derives an irreversible paid then reversed commission as clawback debt', () => {
    expect(deriveSellerAffiliateDisplayStatus(statement('confirmed', 'reversed'))).toBe(
      'clawback_due'
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

  it('shows confirmed then reversed commission as clawback debt', () => {
    const lines = [line({ status: 'reversed', settlement: { state: 'confirmed' } })];

    expect(groupSellerAffiliateStatementLines(lines)[0].displayStatus).toBe('clawback_due');
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

describe('attribution window fidelity', () => {
  it('describes windows in the largest exact unit — a 1-hour window is never "1 day"', async () => {
    const { describeSellerAffiliateAttributionWindow } =
      await import('../../utils/sellerAffiliate');
    expect(describeSellerAffiliateAttributionWindow(7 * 86_400)).toEqual({
      unit: 'day',
      value: 7,
    });
    expect(describeSellerAffiliateAttributionWindow(3_600)).toEqual({ unit: 'hour', value: 1 });
    expect(describeSellerAffiliateAttributionWindow(43_200)).toEqual({ unit: 'hour', value: 12 });
    expect(describeSellerAffiliateAttributionWindow(90)).toEqual({ unit: 'second', value: 90 });
    expect(describeSellerAffiliateAttributionWindow(300)).toEqual({ unit: 'minute', value: 5 });
  });

  it('maps windows to i18n copy keyed by unit and plurality', async () => {
    const { sellerAffiliateAttributionWindowCopy } = await import('../../utils/sellerAffiliate');
    expect(sellerAffiliateAttributionWindowCopy(86_400)).toEqual({
      key: 'sellerAffiliate.windowDay',
    });
    expect(sellerAffiliateAttributionWindowCopy(7 * 86_400)).toEqual({
      key: 'sellerAffiliate.windowDays',
      params: { count: '7' },
    });
    expect(sellerAffiliateAttributionWindowCopy(3_600)).toEqual({
      key: 'sellerAffiliate.windowHour',
    });
  });

  it('round-trips the days input without inventing precision', async () => {
    const { sellerAffiliateAttributionDaysInput, sellerAffiliateAttributionSecondsFromDaysInput } =
      await import('../../utils/sellerAffiliate');
    expect(sellerAffiliateAttributionDaysInput(7 * 86_400)).toBe('7');
    expect(sellerAffiliateAttributionDaysInput(3_600)).toBe('0.04');
    expect(sellerAffiliateAttributionDaysInput(43_200)).toBe('0.5');

    expect(sellerAffiliateAttributionSecondsFromDaysInput('14')).toBe(14 * 86_400);
    expect(sellerAffiliateAttributionSecondsFromDaysInput('0.5')).toBe(43_200);
    expect(sellerAffiliateAttributionSecondsFromDaysInput('0')).toBeNull();
    expect(sellerAffiliateAttributionSecondsFromDaysInput('abc')).toBeNull();
    expect(sellerAffiliateAttributionSecondsFromDaysInput('400')).toBeNull();
  });
});

describe('normalizeSellerAffiliateLink payout rails', () => {
  it('projects payout rails and drops malformed entries without failing the link', async () => {
    const { normalizeSellerAffiliateLink } = await import('../../utils/sellerAffiliate');
    const link = normalizeSellerAffiliateLink({
      id: 'link-1',
      programID: 'program-1',
      promoterPeerID: 'promoter-1',
      publicToken: 'token-1',
      publicPath: '/promo/token-1',
      status: 'active',
      payoutRails: [
        { railID: 'crypto:eip155:1:native', railLabel: 'Ethereum (ETH)', address: '0xabc' },
        { railID: '', address: '0xdef' },
        { railID: 'crypto:solana:mainnet:native', address: 'So1abc' },
        'garbage',
      ],
      createdAt: '2026-07-13T00:00:00Z',
      updatedAt: '2026-07-13T00:00:00Z',
    });
    expect(link.payoutRails).toEqual([
      { railID: 'crypto:eip155:1:native', railLabel: 'Ethereum (ETH)', address: '0xabc' },
      { railID: 'crypto:solana:mainnet:native', address: 'So1abc' },
    ]);
  });

  it('omits payoutRails entirely on backends that predate the field', async () => {
    const { normalizeSellerAffiliateLink } = await import('../../utils/sellerAffiliate');
    const link = normalizeSellerAffiliateLink({
      id: 'link-1',
      programID: 'program-1',
      promoterPeerID: 'promoter-1',
      publicToken: 'token-1',
      publicPath: '/promo/token-1',
      status: 'active',
      createdAt: '2026-07-13T00:00:00Z',
      updatedAt: '2026-07-13T00:00:00Z',
    });
    expect(link.payoutRails).toBeUndefined();
  });
});

describe('unwrapSellerAffiliateList envelopes', () => {
  it('unwraps the paginated statements envelope — the shape that silently emptied every statement', async () => {
    const { unwrapSellerAffiliateList } = await import('../../utils/sellerAffiliate');
    const paginated = {
      data: { items: [{ a: 1 }, { b: 2 }], page: 1, pageSize: 20, total: 13, partial: false },
    };
    expect(unwrapSellerAffiliateList(paginated)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('still accepts the legacy bare-array shape', async () => {
    const { unwrapSellerAffiliateList } = await import('../../utils/sellerAffiliate');
    expect(unwrapSellerAffiliateList({ data: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(unwrapSellerAffiliateList([{ a: 1 }])).toEqual([{ a: 1 }]);
    expect(unwrapSellerAffiliateList({ data: { page: 1 } })).toEqual([]);
  });
});

describe('sellerAffiliateAttributionWindowAdvice', () => {
  it('flags a sub-day window as too short and a sub-week window as short', async () => {
    const { sellerAffiliateAttributionWindowAdvice } = await import('../../utils/sellerAffiliate');
    expect(sellerAffiliateAttributionWindowAdvice(3_600)).toBe('too_short');
    expect(sellerAffiliateAttributionWindowAdvice(86_400 - 1)).toBe('too_short');
    expect(sellerAffiliateAttributionWindowAdvice(86_400)).toBe('short');
    expect(sellerAffiliateAttributionWindowAdvice(6 * 86_400)).toBe('short');
    expect(sellerAffiliateAttributionWindowAdvice(7 * 86_400)).toBeNull();
    expect(sellerAffiliateAttributionWindowAdvice(30 * 86_400)).toBeNull();
    expect(sellerAffiliateAttributionWindowAdvice(0)).toBeNull();
  });
});

describe('estimateSellerAffiliateCommissionAtomic', () => {
  it('applies the basis-point rate and floors like the backend', async () => {
    const { estimateSellerAffiliateCommissionAtomic } = await import('../../utils/sellerAffiliate');
    // 5% of 10_000 minimal units = 500.
    expect(estimateSellerAffiliateCommissionAtomic('10000', 500)).toBe('500');
    // Flooring: 5% of 199 = 9.95 -> 9.
    expect(estimateSellerAffiliateCommissionAtomic('199', 500)).toBe('9');
  });

  it('stays exact for amounts beyond Number.MAX_SAFE_INTEGER (wei-scale)', async () => {
    const { estimateSellerAffiliateCommissionAtomic } = await import('../../utils/sellerAffiliate');
    // 10% of 1e19 wei = 1e18 wei, unrepresentable in float64.
    expect(estimateSellerAffiliateCommissionAtomic('10000000000000000000', 1000)).toBe(
      '1000000000000000000'
    );
  });

  it('returns "0" for a non-positive amount or rate', async () => {
    const { estimateSellerAffiliateCommissionAtomic } = await import('../../utils/sellerAffiliate');
    expect(estimateSellerAffiliateCommissionAtomic('0', 500)).toBe('0');
    expect(estimateSellerAffiliateCommissionAtomic('10000', 0)).toBe('0');
    expect(estimateSellerAffiliateCommissionAtomic('nope', 500)).toBe('0');
  });
});

describe('summarizeSellerAffiliateEarnings', () => {
  it('counts lifecycle buckets and sums paid commission per currency', () => {
    const groups = groupSellerAffiliateStatementLines([
      // Paid order in ETH.
      line({ orderID: 'o1', commissionAtomic: '100', settlement: { state: 'confirmed' } }),
      // A second paid ETH order — sums with the first.
      line({ orderID: 'o2', commissionAtomic: '250', settlement: { state: 'confirmed' } }),
      // Paid order in a different currency — kept separate, never cross-summed.
      line({
        orderID: 'o3',
        currency: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
        commissionAtomic: '77',
        settlement: { state: 'confirmed' },
      }),
      // Settling (in-progress).
      line({ orderID: 'o4', settlement: { state: 'submitted' } }),
      // Pending (in-progress).
      line({ orderID: 'o5' }),
      // Reversed — neither paid nor in-progress.
      line({ orderID: 'o6', status: 'reversed' }),
    ]);

    const summary = summarizeSellerAffiliateEarnings(groups);

    expect(summary.totalOrders).toBe(6);
    expect(summary.paidOrders).toBe(3);
    expect(summary.pendingOrders).toBe(2);
    expect(summary.paidByCurrency).toEqual([
      { currency: 'crypto:eip155:1:native', commissionAtomic: '350' },
      {
        currency: 'crypto:bip122:000000000019d6689c085ae165831e93:native',
        commissionAtomic: '77',
      },
    ]);
  });

  it('is all-zero for an empty statement', () => {
    expect(summarizeSellerAffiliateEarnings([])).toEqual({
      totalOrders: 0,
      paidOrders: 0,
      pendingOrders: 0,
      paidByCurrency: [],
    });
  });
});
