// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { SellerAffiliateReferralSession } from '../types/sellerAffiliate';

export const SELLER_AFFILIATE_REFERRAL_SESSION_KEY = 'mobazha:seller-affiliate-referral';

function isUsable(value: SellerAffiliateReferralSession, now = Date.now()): boolean {
  return (
    Boolean(value.referralSessionID && value.sellerPeerID && value.expiresAt) &&
    Number.isFinite(Date.parse(value.expiresAt)) &&
    Date.parse(value.expiresAt) > now
  );
}

export function readSellerAffiliateReferralSession(): SellerAffiliateReferralSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem(SELLER_AFFILIATE_REFERRAL_SESSION_KEY) ?? 'null'
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
  sessionStorage.setItem(SELLER_AFFILIATE_REFERRAL_SESSION_KEY, JSON.stringify(value));
}

export function clearSellerAffiliateReferralSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SELLER_AFFILIATE_REFERRAL_SESSION_KEY);
}

export function referralSessionForSeller(
  sellerPeerID: string | undefined
): SellerAffiliateReferralSession | null {
  const session = readSellerAffiliateReferralSession();
  return session?.sellerPeerID === sellerPeerID ? session : null;
}
