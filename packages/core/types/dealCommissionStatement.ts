// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { DealPromotionSettlementMode } from './dealPromotion';

/** Read-only provisional commission observation (not a payable balance). */
export interface DealCommissionStatement {
  id: string;
  attributionClaimID: string;
  acceptanceID: string;
  orderID: string;
  programID: string;
  dealLinkID: string;
  status: string;
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
}

export type DealCommissionStatementAudience = 'seller' | 'promoter';
