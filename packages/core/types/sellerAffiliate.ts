// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/** The only Phase 1 commission states. They do not imply a platform payout. */
export type SellerAffiliateCommissionStatus = 'pending' | 'earned' | 'reversed';

export type SellerAffiliateProgramStatus = 'active' | 'paused';

export interface SellerAffiliateProgram {
  id: string;
  sellerPeerID: string;
  status: SellerAffiliateProgramStatus;
  commissionRateBPS: number;
  attributionWindowSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerAffiliateProgramRequest {
  status: SellerAffiliateProgramStatus;
  commissionRateBPS: number;
  attributionWindowSeconds: number;
}

export interface SellerAffiliateLink {
  id: string;
  programID: string;
  promoterPeerID: string;
  publicToken: string;
  publicPath: string;
  status: 'active' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export interface PublicSellerAffiliateLink {
  programID: string;
  sellerPeerID: string;
  status: SellerAffiliateProgramStatus;
  commissionRateBPS: number;
  attributionWindowSeconds: number;
}

/** Browser-local referral state; only attached to a checkout for the same seller. */
export interface SellerAffiliateReferralSession {
  referralSessionID: string;
  sellerPeerID: string;
  expiresAt: string;
}

export interface SellerAffiliateAttribution {
  id: string;
  orderID: string;
  referralSessionID: string;
  programID: string;
  sellerPeerID: string;
  buyerPeerID: string;
  promoterPeerID: string;
  commissionRateBPSSnapshot: number;
  attributedAt: string;
}

export interface SellerAffiliateCommissionLine {
  attributionID: string;
  orderID: string;
  orderLineID: string;
  netMerchandiseAtomic: string;
  commissionAtomic: string;
  currency: string;
  status: SellerAffiliateCommissionStatus;
  earnedAt?: string;
  reversedAt?: string;
  reversalReason?: string;
}

export interface SellerAffiliateStatementLine {
  attribution: SellerAffiliateAttribution;
  commissionLine: SellerAffiliateCommissionLine;
}

export type SellerAffiliateStatementAudience = 'seller' | 'promoter';
