// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  convertAtomicAmountToMajor,
  formatAtomicCommissionAmount,
  normalizeDealCommissionStatement,
  truncateStatementReference,
} from '../../utils/dealCommissionStatement';

describe('dealCommissionStatement utils', () => {
  it('normalizes hosting statement payloads with atomic string amounts', () => {
    const statement = normalizeDealCommissionStatement({
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
    });

    expect(statement.proposedCommissionAmountAtomic).toBe('500');
    expect(statement.commissionBaseAmountAtomic).toBe('10000');
    expect(statement.payable).toBe(false);
    expect(statement.settlementMode).toBe('manual_review_only');
  });

  it('converts atomic amounts using backend divisibility without Number coercion', () => {
    expect(convertAtomicAmountToMajor('12345', 2)).toEqual({ ok: true, majorAmount: '123.45' });
    expect(convertAtomicAmountToMajor('100000000', 8)).toEqual({
      ok: true,
      majorAmount: '1',
    });
    expect(convertAtomicAmountToMajor('abc', 2)).toEqual({ ok: false, reason: 'invalid_amount' });
    expect(convertAtomicAmountToMajor('100', 99)).toEqual({
      ok: false,
      reason: 'invalid_divisibility',
    });
    expect(convertAtomicAmountToMajor('-1', 2)).toEqual({
      ok: false,
      reason: 'invalid_amount',
    });
    expect(convertAtomicAmountToMajor('123456789012345678901234567890', 18)).toEqual({
      ok: true,
      majorAmount: '123456789012.34567890123456789',
    });
  });

  it('rejects lossy or guessed financial payload fields', () => {
    const valid = {
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
      reviewNotBefore: '2026-08-04T12:00:00Z',
      observedAt: '2026-07-05T12:00:00Z',
    };

    expect(() =>
      normalizeDealCommissionStatement({ ...valid, proposedCommissionAmountAtomic: 500 })
    ).toThrow('proposedCommissionAmountAtomic');
    expect(() =>
      normalizeDealCommissionStatement({ ...valid, currencyDivisibility: undefined })
    ).toThrow('currencyDivisibility');
    expect(() => normalizeDealCommissionStatement({ ...valid, payable: true })).toThrow('payable');
  });

  it('formats atomic commission amounts with visible currency and explicit failures', () => {
    const formatPrice = (amount: number | string, currency: string) => `$${amount} ${currency}`;

    expect(
      formatAtomicCommissionAmount({
        amountAtomic: '500',
        currency: 'USD',
        currencyDivisibility: 2,
        formatPrice,
        missingCurrencyLabel: 'missing',
        invalidAmountLabel: 'invalid',
      })
    ).toEqual({ ok: true, display: '$5 USD', currency: 'USD' });

    expect(
      formatAtomicCommissionAmount({
        amountAtomic: '500',
        currency: '',
        currencyDivisibility: 2,
        formatPrice,
        missingCurrencyLabel: 'missing',
        invalidAmountLabel: 'invalid',
      })
    ).toEqual({ ok: false, display: 'missing', reason: 'missing_currency' });
  });

  it('truncates long statement references for display', () => {
    expect(truncateStatementReference('QmLongOrderIdentifierExample1234567890')).toBe(
      'QmLong…7890'
    );
  });
});
