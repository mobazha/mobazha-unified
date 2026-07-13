// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { SellerAffiliateReferralSession } from '../types/sellerAffiliate';
import { ApiError } from '../services/api/client';

export const SELLER_AFFILIATE_REFERRAL_SESSION_KEY = 'mobazha:seller-affiliate-referral';

function isUsable(value: SellerAffiliateReferralSession, now = Date.now()): boolean {
  return (
    Boolean(value.referralSessionID && value.sellerPeerID && value.expiresAt) &&
    Number.isFinite(Date.parse(value.expiresAt)) &&
    Date.parse(value.expiresAt) > now
  );
}

// Persist referral state in localStorage, not sessionStorage: the seller sets an
// attribution window (up to 30 days) and the session carries its own server-issued
// expiresAt, so attribution must survive a tab close and only lapse when that expiry
// passes — sessionStorage would silently drop credit the moment the tab closes.
export function readSellerAffiliateReferralSession(): SellerAffiliateReferralSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(SELLER_AFFILIATE_REFERRAL_SESSION_KEY) ??
        // Migrate any referral written by a prior sessionStorage-based build.
        sessionStorage.getItem(SELLER_AFFILIATE_REFERRAL_SESSION_KEY) ??
        'null'
    );
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const value = parsed as SellerAffiliateReferralSession;
    if (!isUsable(value)) {
      clearSellerAffiliateReferralSession();
      return null;
    }
    return value;
  } catch {
    clearSellerAffiliateReferralSession();
    return null;
  }
}

export function writeSellerAffiliateReferralSession(value: SellerAffiliateReferralSession): void {
  if (typeof window === 'undefined' || !isUsable(value)) return;
  localStorage.setItem(SELLER_AFFILIATE_REFERRAL_SESSION_KEY, JSON.stringify(value));
}

export function clearSellerAffiliateReferralSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SELLER_AFFILIATE_REFERRAL_SESSION_KEY);
  sessionStorage.removeItem(SELLER_AFFILIATE_REFERRAL_SESSION_KEY);
}

export function referralSessionForSeller(
  sellerPeerID: string | undefined
): SellerAffiliateReferralSession | null {
  const session = readSellerAffiliateReferralSession();
  return session?.sellerPeerID === sellerPeerID ? session : null;
}

/** Returns true only when the server explicitly rejected affiliate facts. */
export function shouldClearSellerAffiliateReferralOnError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (![400, 404, 409, 410].includes(error.status ?? 0)) return false;
  const haystack = `${error.code ?? ''} ${error.message} ${error.detail ?? ''}`.toLowerCase();
  return haystack.includes('affiliate') || haystack.includes('referral');
}
