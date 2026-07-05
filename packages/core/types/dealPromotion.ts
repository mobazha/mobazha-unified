// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

export interface DealPromotionProgramRequest {
  dealLinkID: string;
  name: string;
  commissionRateBPS: number;
  maxCommissionAmount?: string;
  attributionWindowSeconds: number;
}

export type DealPromotionSettlementMode = 'manual_review_only' | string;

export type DealPromotionProgramStatus = 'draft' | 'active' | 'paused' | string;

/** Seller-owned promotion program (immutable economics once active). */
export interface DealPromotionProgram {
  id: string;
  sellerPeerID: string;
  dealLinkID: string;
  name: string;
  status: DealPromotionProgramStatus;
  schemaVersion: number;
  policyVersion: string;
  commissionRateBPS: number;
  calculationBase: string;
  maxCommissionAmount?: string;
  currency: string;
  attributionWindowSeconds: number;
  declaredFundingSource: string;
  settlementMode: DealPromotionSettlementMode;
  createdAt: string;
  updatedAt: string;
}

/** Promoter direct link for a single-level program. */
export interface DealPromotionLink {
  id: string;
  programID: string;
  status: string;
  publicToken: string;
  publicPath: string;
  createdAt: string;
}

/** Anonymous promotion-link resolution before claim issuance. */
export interface PublicDealPromotionLink {
  programID: string;
  programName: string;
  dealLinkID: string;
  dealPublicPath: string;
  dealRevision: number;
  termsHash: string;
  currency: string;
  commissionRateBPS: number;
  attributionWindowSeconds: number;
  settlementMode: DealPromotionSettlementMode;
}

/** Short-lived signed claim bound to a deal revision. */
export interface DealAttributionClaim {
  claimToken: string;
  expiresAt: string;
  dealLinkID: string;
  dealRevision: number;
  termsHash: string;
  programPolicyVersion: string;
  commissionRateBPS: number;
  calculationBase: string;
  maxCommissionAmount?: string;
  currency: string;
  settlementMode: DealPromotionSettlementMode;
}

/** Session-scoped claim bound to the buyer-facing deal token. */
export interface StoredDealAttributionClaim extends DealAttributionClaim {
  dealToken: string;
  attributionWindowSeconds?: number;
}

export type DealPromotionPageErrorKind =
  | 'not_found'
  | 'inactive'
  | 'expired'
  | 'network'
  | 'unknown';
