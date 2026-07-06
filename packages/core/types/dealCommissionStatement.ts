// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { DealPromotionSettlementMode } from './dealPromotion';

export type DealCommissionStatementStatus =
  | 'observed'
  | 'pending_review'
  | 'disputed'
  | 'reversed'
  | 'settled';

export type DealCommissionEligibilityDecision = 'deferred' | 'eligible' | 'disputed' | 'reversed';

/** Read-only provisional commission observation (not a payable balance). */
export interface DealCommissionStatement {
  id: string;
  attributionClaimID: string;
  acceptanceID: string;
  orderID: string;
  programID: string;
  dealLinkID: string;
  status: DealCommissionStatementStatus;
  calculationBase: string;
  commissionRateBPS: number;
  commissionBaseAmountAtomic: string;
  proposedCommissionAmountAtomic: string;
  currency: string;
  currencyDivisibility: number;
  declaredFundingSource: string;
  settlementMode: DealPromotionSettlementMode;
  payable: boolean;
  reviewNotBefore: string;
  observedAt: string;
  /** Present after eligibility review; omitted on pre-review responses. */
  lastEligibilityDecision?: DealCommissionEligibilityDecision;
  /** Known codes are localized; unknown non-empty strings use a fallback label. */
  lastEligibilityReasons?: string[];
  /** ISO date-time when eligibility was last reviewed; omitted on pre-review responses. */
  eligibilityReviewedAt?: string;
}

export type DealCommissionStatementAudience = 'seller' | 'promoter';
