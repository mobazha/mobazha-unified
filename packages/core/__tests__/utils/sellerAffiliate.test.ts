// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  deriveSellerAffiliateDisplayStatus,
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
  it.each([
    [undefined, 'pending'],
    ['planned', 'settling'],
    ['submitted', 'settling'],
    ['confirmed', 'paid'],
  ] as const)('derives %s settlement as %s', (settlementState, expected) => {
    expect(deriveSellerAffiliateDisplayStatus(statement(settlementState))).toBe(expected);
  });

  it('keeps reversed authoritative even if an output is confirmed', () => {
    expect(deriveSellerAffiliateDisplayStatus(statement('confirmed', 'reversed'))).toBe('reversed');
  });

  it('rejects the removed earned commission state', () => {
    expect(() => statement(undefined, 'earned')).toThrow(
      'Invalid seller affiliate commission status'
    );
  });
});
