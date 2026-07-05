// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildStoredDealAttributionClaim,
  clearStoredDealAttributionClaim,
  extractDealTokenFromPublicPath,
  formatCommissionRateFromBPS,
  isValidOptionalCommissionAmount,
  isStoredDealAttributionClaimValid,
  normalizeDealAttributionClaim,
  normalizeDealPromotionProgram,
  parseCommissionPercentToBPS,
  parseAttributionWindowDaysToSeconds,
  readStoredDealAttributionClaim,
  writeStoredDealAttributionClaim,
  shouldClearDealAttributionClaimOnError,
  DEAL_ATTRIBUTION_CLAIM_SESSION_KEY,
} from '../../utils/dealPromotion';
import { ApiError } from '../../services/api/client';

describe('dealPromotion utils', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('extracts deal token from hosting public path', () => {
    expect(extractDealTokenFromPublicPath('/platform/v1/public/deal-links/deal-public-token')).toBe(
      'deal-public-token'
    );
  });

  it('normalizes promotion program projections', () => {
    const program = normalizeDealPromotionProgram({
      id: 'prog-1',
      sellerPeerID: 'QmSeller',
      dealLinkID: 'deal-1',
      name: 'Creators',
      status: 'draft',
      schemaVersion: 1,
      policyVersion: 'single-level-direct-v1',
      commissionRateBPS: 500,
      calculationBase: 'gross_order_amount',
      currency: 'USD',
      attributionWindowSeconds: 604800,
      declaredFundingSource: 'seller_manual_budget',
      settlementMode: 'manual_review_only',
      createdAt: '2026-07-05T00:00:00Z',
      updatedAt: '2026-07-05T00:00:00Z',
    });

    expect(program.settlementMode).toBe('manual_review_only');
    expect(program.declaredFundingSource).toBe('seller_manual_budget');
    expect(program.commissionRateBPS).toBe(500);
  });

  it('converts commission percent to BPS', () => {
    expect(parseCommissionPercentToBPS('5')).toBe(500);
    expect(parseCommissionPercentToBPS('2.25')).toBe(225);
    expect(parseCommissionPercentToBPS('2.225')).toBeNull();
    expect(formatCommissionRateFromBPS(500)).toBe('5');
  });

  it('enforces seller program input bounds', () => {
    expect(parseAttributionWindowDaysToSeconds('1')).toBe(86400);
    expect(parseAttributionWindowDaysToSeconds('30')).toBe(2592000);
    expect(parseAttributionWindowDaysToSeconds('31')).toBeNull();
    expect(parseAttributionWindowDaysToSeconds('1.5')).toBeNull();
    expect(isValidOptionalCommissionAmount('')).toBe(true);
    expect(isValidOptionalCommissionAmount('25.00')).toBe(true);
    expect(isValidOptionalCommissionAmount('0')).toBe(false);
    expect(isValidOptionalCommissionAmount('1.1234567890123456789')).toBe(false);
  });

  it('only clears claims for explicit attribution rejections', () => {
    expect(
      shouldClearDealAttributionClaimOnError(
        new ApiError('attribution claim expired', 410, 'ATTRIBUTION_CLAIM_EXPIRED')
      )
    ).toBe(true);
    expect(shouldClearDealAttributionClaimOnError(new ApiError('fee quote expired', 410))).toBe(
      false
    );
    expect(shouldClearDealAttributionClaimOnError(new TypeError('Failed to fetch'))).toBe(false);
  });

  it('stores and validates session-scoped claims', () => {
    const claim = normalizeDealAttributionClaim({
      claimToken: 'signed-token',
      expiresAt: '2099-01-01T00:00:00Z',
      dealLinkID: 'deal-1',
      dealRevision: 2,
      termsHash: 'hash',
      programPolicyVersion: 'single-level-direct-v1',
      commissionRateBPS: 500,
      calculationBase: 'gross_order_amount',
      currency: 'USD',
      settlementMode: 'manual_review_only',
    });

    writeStoredDealAttributionClaim(
      buildStoredDealAttributionClaim(claim, 'deal-token', {
        attributionWindowSeconds: 604800,
      })
    );

    const stored = readStoredDealAttributionClaim();
    expect(stored?.dealToken).toBe('deal-token');
    expect(isStoredDealAttributionClaimValid(stored, 'deal-token')).toBe(true);
    expect(isStoredDealAttributionClaimValid(stored, 'other-token')).toBe(false);
    expect(sessionStorage.getItem(DEAL_ATTRIBUTION_CLAIM_SESSION_KEY)).toContain('deal-token');

    clearStoredDealAttributionClaim();
    expect(readStoredDealAttributionClaim()).toBeNull();
  });

  it('removes malformed session claims', () => {
    sessionStorage.setItem(DEAL_ATTRIBUTION_CLAIM_SESSION_KEY, '{bad-json');
    expect(readStoredDealAttributionClaim()).toBeNull();
    expect(sessionStorage.getItem(DEAL_ATTRIBUTION_CLAIM_SESSION_KEY)).toBeNull();
  });
});
