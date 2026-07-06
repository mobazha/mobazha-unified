// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  listPromoterDealCommissionStatements,
  listSellerDealCommissionStatements,
} from '../../../services/api/dealCommissionStatement';

vi.mock('../../../services/api/helpers', () => ({
  hostingGet: vi.fn(),
}));

import { hostingGet } from '../../../services/api/helpers';

describe('dealCommissionStatement API service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists seller-funded provisional statements newest-first from hosting', async () => {
    vi.mocked(hostingGet).mockResolvedValue([
      {
        id: 'stmt-1',
        attributionClaimID: 'claim-1',
        acceptanceID: 'acc-1',
        orderID: 'order-1',
        programID: 'prog-1',
        dealLinkID: 'deal-1',
        status: 'observed',
        calculationBase: 'gross_order_amount',
        commissionRateBPS: 500,
        commissionBaseAmountAtomic: '10000',
        proposedCommissionAmountAtomic: '500',
        currency: 'USD',
        currencyDivisibility: 2,
        declaredFundingSource: 'seller_manual_budget',
        settlementMode: 'manual_review_only',
        payable: false,
        reviewNotBefore: '2026-07-10T00:00:00Z',
        observedAt: '2026-07-05T12:00:00Z',
      },
    ]);

    const statements = await listSellerDealCommissionStatements();
    expect(hostingGet).toHaveBeenCalledWith('/platform/v1/deal-commission-statements/seller');
    expect(statements[0]?.payable).toBe(false);
    expect(statements[0]?.proposedCommissionAmountAtomic).toBe('500');
  });

  it('lists promoter-attributed provisional statements', async () => {
    vi.mocked(hostingGet).mockResolvedValue({
      data: [
        {
          id: 'stmt-2',
          attributionClaimID: 'claim-2',
          acceptanceID: 'acc-2',
          orderID: 'order-2',
          programID: 'prog-2',
          dealLinkID: 'deal-2',
          status: 'pending_review',
          calculationBase: 'gross_order_amount',
          commissionRateBPS: 750,
          commissionBaseAmountAtomic: '20000',
          proposedCommissionAmountAtomic: '1500',
          currency: 'USD',
          currencyDivisibility: 2,
          declaredFundingSource: 'seller_manual_budget',
          settlementMode: 'manual_review_only',
          payable: false,
          reviewNotBefore: '2026-07-12T00:00:00Z',
          observedAt: '2026-07-06T12:00:00Z',
        },
      ],
    });

    const statements = await listPromoterDealCommissionStatements();
    expect(hostingGet).toHaveBeenCalledWith('/platform/v1/deal-commission-statements/promoter');
    expect(statements[0]?.status).toBe('pending_review');
  });

  it('preserves reviewed eligibility projection from hosting responses', async () => {
    vi.mocked(hostingGet).mockResolvedValue([
      {
        id: 'stmt-reviewed',
        attributionClaimID: 'claim-3',
        acceptanceID: 'acc-3',
        orderID: 'order-3',
        programID: 'prog-3',
        dealLinkID: 'deal-3',
        status: 'disputed',
        calculationBase: 'gross_order_amount',
        commissionRateBPS: 500,
        commissionBaseAmountAtomic: '10000',
        proposedCommissionAmountAtomic: '500',
        currency: 'USD',
        currencyDivisibility: 2,
        declaredFundingSource: 'seller_manual_budget',
        settlementMode: 'manual_review_only',
        payable: false,
        reviewNotBefore: '2026-07-10T00:00:00Z',
        observedAt: '2026-07-05T12:00:00Z',
        lastEligibilityDecision: 'disputed',
        lastEligibilityReasons: ['dispute_history', 'already_disputed'],
        eligibilityReviewedAt: '2026-07-09T10:00:00Z',
      },
    ]);

    const statements = await listSellerDealCommissionStatements();
    expect(statements[0]?.status).toBe('disputed');
    expect(statements[0]?.lastEligibilityDecision).toBe('disputed');
    expect(statements[0]?.lastEligibilityReasons).toEqual(['dispute_history', 'already_disputed']);
    expect(statements[0]?.eligibilityReviewedAt).toBe('2026-07-09T10:00:00Z');
  });

  it('rejects malformed responses instead of presenting an empty statement', async () => {
    vi.mocked(hostingGet).mockResolvedValue({ unexpected: [] });

    await expect(listSellerDealCommissionStatements()).rejects.toThrow(
      'Invalid Deal commission statement response'
    );
  });
});
