// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/** The only Phase 1 commission states. They do not imply a platform payout. */
export type SellerAffiliateCommissionStatus = 'pending' | 'reversed';

/** UI state derived from commission facts and backend settlement confirmation. */
export type SellerAffiliateDisplayStatus = 'pending' | 'settling' | 'paid' | 'reversed';

export type SellerAffiliateSettlementState = 'planned' | 'submitted' | 'confirmed';

export type SellerAffiliateBuyerKind = 'peer' | 'guest';

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
  buyerKind: SellerAffiliateBuyerKind;
  buyerPeerID?: string;
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
  reversedAt?: string;
  reversalReason?: string;
}

export interface SellerAffiliateSettlementOutput {
  actionID: string;
  action: string;
  state: SellerAffiliateSettlementState;
  txHash?: string;
  coin: string;
  amount: string;
  address: string;
  confirmations?: number;
  updatedAt: string;
  confirmedAt?: string;
}

export interface SellerAffiliateStatementLine {
  attribution: SellerAffiliateAttribution;
  commissionLine: SellerAffiliateCommissionLine;
  settlement?: SellerAffiliateSettlementOutput;
}

export type SellerAffiliateStatementAudience = 'seller' | 'promoter';

export interface SellerAffiliateRailCapability {
  railID: string;
  assetScope: 'chain' | 'native' | 'exact';
  orderKinds: Array<'standard' | 'guest'>;
  actions: string[];
  guestSupport: boolean;
}

export interface SellerAffiliateCapabilities {
  version: number;
  rails: SellerAffiliateRailCapability[];
}

export interface SellerAffiliateStatementSourceError {
  linkID: string;
  code: string;
}

export interface SellerAffiliateStatementPage {
  items: SellerAffiliateStatementLine[];
  page: number;
  pageSize: number;
  total: number;
  partial: boolean;
  sourceErrors: SellerAffiliateStatementSourceError[];
}

/**
 * One order's commission lines for a single currency, collapsed so the same
 * settlement (and its tx) is not shown or summed once per underlying line.
 */
export interface SellerAffiliateGroupedStatement {
  orderID: string;
  currency: string;
  commissionAtomic: string;
  displayStatus: SellerAffiliateDisplayStatus;
  settlement?: SellerAffiliateSettlementOutput;
  lines: SellerAffiliateStatementLine[];
}
