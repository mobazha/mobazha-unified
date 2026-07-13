// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { components } from '../types/api-generated';

type Schemas = components['schemas'];

export type CollateralAccount = Schemas['Node_CollateralAccountView'];
export type CollateralFundingTarget = Schemas['Node_FundingTarget'];
export type CollateralFundingStatus = Schemas['Node_OperatorFundingStatus'];
export interface CollateralAccountsResult {
  items: CollateralAccount[] | null;
}
export interface CollateralRailDescriptor {
  custodyModel: string;
  hasReceiptVerification: boolean;
  id: string;
  supportsClaimSlash: boolean;
  supportsFundingObserve: boolean;
  supportsFundingTargets: boolean;
  supportsPrincipalRelease: boolean;
  supportsReconciliation: boolean;
  version: string;
  assets: string[];
}
export type CollateralAccountOpenInput = Schemas['Node_OpenInputBody'];
export type CollateralFundingInput = Schemas['Node_FundingInputBody'];

export interface CollateralAccountListInput {
  providerID: string;
  resourceID: string;
}

export interface CollateralCapabilities {
  available: boolean;
  rail?: CollateralRailDescriptor;
}

export type CollateralAccountState =
  | 'pending-funding'
  | 'active'
  | 'release-pending'
  | 'released'
  | 'slash-pending'
  | 'slashed'
  | 'failed'
  | string;

export type CollateralProtectionStatus =
  | 'unsecured'
  | 'declared'
  | 'funding'
  | 'active'
  | 'verified-allocation'
  | 'impaired'
  | 'expired';
