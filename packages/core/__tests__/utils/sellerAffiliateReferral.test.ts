// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, describe, expect, it } from 'vitest';
import {
  clearSellerAffiliateReferralSession,
  readSellerAffiliateReferralSession,
  referralSessionForSeller,
  shouldClearSellerAffiliateReferralOnError,
  writeSellerAffiliateReferralSession,
} from '../../utils/sellerAffiliateReferral';
import type { SellerAffiliateReferralSession } from '../../types/sellerAffiliate';
import { ApiError } from '../../services/api/client';

const SELLER_A = 'QmSellerAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const SELLER_B = 'QmSellerBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

function session(
  overrides: Partial<SellerAffiliateReferralSession> = {}
): SellerAffiliateReferralSession {
  return {
    referralSessionID: 'referral-1',
    sellerPeerID: SELLER_A,
    expiresAt: '2099-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('seller affiliate referral session storage', () => {
  afterEach(() => {
    clearSellerAffiliateReferralSession();
  });

  it('returns null when nothing has been saved', () => {
    expect(readSellerAffiliateReferralSession()).toBeNull();
  });

  it('round-trips a saved session', () => {
    writeSellerAffiliateReferralSession(session());
    expect(readSellerAffiliateReferralSession()).toEqual(session());
  });

  it('clears the saved session', () => {
    writeSellerAffiliateReferralSession(session());
    clearSellerAffiliateReferralSession();
    expect(readSellerAffiliateReferralSession()).toBeNull();
  });

  it('never saves an already-expired session', () => {
    writeSellerAffiliateReferralSession(session({ expiresAt: '2000-01-01T00:00:00Z' }));
    expect(readSellerAffiliateReferralSession()).toBeNull();
  });

  it('survives a tab close by persisting in localStorage', () => {
    writeSellerAffiliateReferralSession(session());
    expect(localStorage.getItem('mobazha:seller-affiliate-referral')).not.toBeNull();
    expect(sessionStorage.getItem('mobazha:seller-affiliate-referral')).toBeNull();
  });

  it('migrates a referral left behind by a prior sessionStorage build', () => {
    sessionStorage.setItem(
      'mobazha:seller-affiliate-referral',
      JSON.stringify(session({ referralSessionID: 'legacy-1' }))
    );
    expect(readSellerAffiliateReferralSession()?.referralSessionID).toBe('legacy-1');
  });

  it('treats an already-stale stored session as unusable and clears it on read', () => {
    // Bypass writeSellerAffiliateReferralSession's own expiry guard to simulate a
    // session that was valid when written but has since expired.
    localStorage.setItem(
      'mobazha:seller-affiliate-referral',
      JSON.stringify(session({ expiresAt: '2000-01-01T00:00:00Z' }))
    );
    expect(readSellerAffiliateReferralSession()).toBeNull();
    expect(localStorage.getItem('mobazha:seller-affiliate-referral')).toBeNull();
  });

  it('ignores malformed stored JSON and clears it', () => {
    localStorage.setItem('mobazha:seller-affiliate-referral', '{not-json');
    expect(readSellerAffiliateReferralSession()).toBeNull();
    expect(localStorage.getItem('mobazha:seller-affiliate-referral')).toBeNull();
  });

  it('only returns the session when it matches the requested seller', () => {
    writeSellerAffiliateReferralSession(session({ sellerPeerID: SELLER_A }));

    expect(referralSessionForSeller(SELLER_A)?.referralSessionID).toBe('referral-1');
    expect(referralSessionForSeller(SELLER_B)).toBeNull();
    expect(referralSessionForSeller(undefined)).toBeNull();
  });

  it('does not let a seller B session leak into a seller A lookup after an overwrite', () => {
    writeSellerAffiliateReferralSession(session({ sellerPeerID: SELLER_A }));
    expect(referralSessionForSeller(SELLER_A)).not.toBeNull();

    writeSellerAffiliateReferralSession(
      session({ sellerPeerID: SELLER_B, referralSessionID: 'referral-2' })
    );

    expect(referralSessionForSeller(SELLER_A)).toBeNull();
    expect(referralSessionForSeller(SELLER_B)?.referralSessionID).toBe('referral-2');
  });

  it('only clears referral state for explicit affiliate rejections', () => {
    expect(
      shouldClearSellerAffiliateReferralOnError(
        new ApiError('invalid affiliate referral session', 409, 'CONFLICT')
      )
    ).toBe(true);
    expect(
      shouldClearSellerAffiliateReferralOnError(new ApiError('network unavailable', 503))
    ).toBe(false);
    expect(shouldClearSellerAffiliateReferralOnError(new Error('affiliate failed'))).toBe(false);
  });
});
