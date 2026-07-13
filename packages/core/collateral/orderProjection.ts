// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { Order, OrderCollateralProtection } from '../types/order';
import {
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS,
  COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX,
  validateOrderItemCollateralProjectionFeatures,
  type CollectibleOrderOptionalFeaturesIssue,
} from '../collectibles/orderOptionalFeatures';
import { COLLECTIBLES_COLLATERAL_PROVIDER_ID } from './constants';
import type { CollateralAccount, CollateralProtectionStatus } from './types';
import { resolveCollectibleDepositProtectionStatus } from './projection';

export interface OrderCollateralVerifiedAllocationEvidence {
  status: 'verified-allocation';
  providerID: string;
  resourceID: string;
  assetID: string;
  amount: string;
  policyID: string;
  policyVersion: string;
  issuerPeerID: string;
  extensionID: string;
  extensionRevision: number;
  allocationRevision: number;
  collateralRevision: number;
  issuedAt: string;
  expiresAt: string;
  accountExpiresAt: string;
}

export interface OrderCollectibleCollateralProjection {
  hasCollateralContext: boolean;
  signedFeaturesValid: boolean;
  issue?: CollectibleOrderOptionalFeaturesIssue;
  sourceDepositID?: string;
  collateralAssetID?: string;
  collateralAmount?: string;
  collateralPolicyId?: string;
  collateralPolicyVersion?: string;
}

function itemHasCollectibleSignedFeatures(
  optionalFeatures: readonly string[] | null | undefined
): boolean {
  if (!optionalFeatures?.length) return false;
  for (const feature of optionalFeatures) {
    const trimmed = feature.trim();
    if (trimmed.startsWith(COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX)) {
      return true;
    }
  }
  return false;
}

function extractCollectibleOrderItemOptionalFeatures(
  optionalFeatures: readonly string[] | null | undefined
): string[] {
  if (!optionalFeatures?.length) return [];
  const features: string[] = [];
  for (const feature of optionalFeatures) {
    const trimmed = feature.trim();
    if (!trimmed.startsWith(COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX)) continue;
    features.push(trimmed);
  }
  return features;
}

function projectionFromCollateralValues(
  values: Map<string, string>
): OrderCollectibleCollateralProjection {
  return {
    hasCollateralContext: true,
    signedFeaturesValid: true,
    sourceDepositID: values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.sourceDepositId),
    collateralAssetID: values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId),
    collateralAmount: values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount),
    collateralPolicyId: values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyId),
    collateralPolicyVersion: values.get(
      COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyVersion
    ),
  };
}

/** Extract signed collectible collateral bindings from orderOpen.items optional features. */
export function resolveOrderCollectibleCollateralProjection(
  order: Order | null | undefined
): OrderCollectibleCollateralProjection {
  const items = order?.contract?.orderOpen?.items;
  if (!items?.length) {
    return {
      hasCollateralContext: false,
      signedFeaturesValid: true,
    };
  }

  let firstValidProjection: OrderCollectibleCollateralProjection | null = null;
  let invalidIssue: CollectibleOrderOptionalFeaturesIssue | undefined;
  let hasCollectibleSignedContext = false;

  for (const item of items) {
    const optionalFeatures = item.optionalFeatures;
    if (!itemHasCollectibleSignedFeatures(optionalFeatures)) {
      continue;
    }

    const collectibleFeatures = extractCollectibleOrderItemOptionalFeatures(optionalFeatures);
    const collateralValidation = validateOrderItemCollateralProjectionFeatures(collectibleFeatures);

    if (collateralValidation.status === 'absent') {
      if (collectibleFeatures.length > 0) {
        hasCollectibleSignedContext = true;
      }
      continue;
    }

    hasCollectibleSignedContext = true;

    if (collateralValidation.status === 'invalid') {
      invalidIssue = collateralValidation.issue;
      continue;
    }

    if (!firstValidProjection) {
      firstValidProjection = projectionFromCollateralValues(collateralValidation.values);
    }
  }

  if (invalidIssue) {
    return {
      hasCollateralContext: hasCollectibleSignedContext,
      signedFeaturesValid: false,
      issue: invalidIssue,
    };
  }

  if (firstValidProjection) {
    return firstValidProjection;
  }

  return {
    hasCollateralContext: false,
    signedFeaturesValid: true,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isParsableTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value.trim()));
}

function isFutureTimestamp(value: string, now: Date): boolean {
  const parsed = Date.parse(value.trim());
  return Number.isFinite(parsed) && parsed > now.getTime();
}

function projectionBindingReady(
  projection: OrderCollectibleCollateralProjection
): projection is OrderCollectibleCollateralProjection & {
  sourceDepositID: string;
  collateralAssetID: string;
  collateralAmount: string;
  collateralPolicyId: string;
  collateralPolicyVersion: string;
} {
  return (
    projection.hasCollateralContext &&
    projection.signedFeaturesValid &&
    Boolean(projection.sourceDepositID?.trim()) &&
    Boolean(projection.collateralAssetID?.trim()) &&
    Boolean(projection.collateralAmount?.trim()) &&
    Boolean(projection.collateralPolicyId?.trim()) &&
    Boolean(projection.collateralPolicyVersion?.trim())
  );
}

/** Fail-closed gate for Core-emitted buyer allocation credentials on order detail. */
export function resolveOrderCollateralVerifiedAllocationEvidence(input: {
  order: Order | null | undefined;
  projection: OrderCollectibleCollateralProjection;
  now?: Date;
}): OrderCollateralVerifiedAllocationEvidence | null {
  const { order, projection, now = new Date() } = input;
  const raw: OrderCollateralProtection | undefined = order?.collateralProtection;
  if (!raw || raw.status !== 'verified-allocation') {
    return null;
  }
  if (!projectionBindingReady(projection)) {
    return null;
  }
  if (raw.providerID?.trim() !== COLLECTIBLES_COLLATERAL_PROVIDER_ID) {
    return null;
  }
  if (raw.resourceID?.trim() !== projection.sourceDepositID.trim()) {
    return null;
  }
  if (raw.assetID?.trim() !== projection.collateralAssetID.trim()) {
    return null;
  }
  if (raw.amount?.trim() !== projection.collateralAmount.trim()) {
    return null;
  }
  if (raw.policyID?.trim() !== projection.collateralPolicyId.trim()) {
    return null;
  }
  if (raw.policyVersion?.trim() !== projection.collateralPolicyVersion.trim()) {
    return null;
  }
  if (!isNonEmptyString(raw.issuerPeerID)) return null;
  if (!isNonEmptyString(raw.extensionID)) return null;
  if (!isPositiveRevision(raw.extensionRevision)) return null;
  if (!isPositiveRevision(raw.allocationRevision)) return null;
  if (!isPositiveRevision(raw.collateralRevision)) return null;
  if (!isNonEmptyString(raw.issuedAt) || !isParsableTimestamp(raw.issuedAt)) return null;
  if (!isNonEmptyString(raw.expiresAt) || !isFutureTimestamp(raw.expiresAt, now)) return null;
  if (!isNonEmptyString(raw.accountExpiresAt) || !isFutureTimestamp(raw.accountExpiresAt, now)) {
    return null;
  }

  return {
    status: 'verified-allocation',
    providerID: raw.providerID.trim(),
    resourceID: raw.resourceID.trim(),
    assetID: raw.assetID.trim(),
    amount: raw.amount.trim(),
    policyID: raw.policyID.trim(),
    policyVersion: raw.policyVersion.trim(),
    issuerPeerID: raw.issuerPeerID.trim(),
    extensionID: raw.extensionID.trim(),
    extensionRevision: raw.extensionRevision,
    allocationRevision: raw.allocationRevision,
    collateralRevision: raw.collateralRevision,
    issuedAt: raw.issuedAt.trim(),
    expiresAt: raw.expiresAt.trim(),
    accountExpiresAt: raw.accountExpiresAt.trim(),
  };
}

export interface OrderCollectibleCollateralProtectionView {
  status: CollateralProtectionStatus;
  projection: OrderCollectibleCollateralProjection;
  deposit: {
    guaranteeAmount?: string;
    guaranteeCurrency?: string;
    collateralRequirementStatus?: string;
  };
  account?: CollateralAccount | null;
  verifiedAllocation?: OrderCollateralVerifiedAllocationEvidence | null;
}

/** Build fail-closed protection view for order pages from declaration + optional live account. */
export function buildOrderCollectibleCollateralProtectionView(input: {
  projection: OrderCollectibleCollateralProjection;
  account?: CollateralAccount | null;
  verifiedAllocation?: OrderCollateralVerifiedAllocationEvidence | null;
  now?: Date;
}): OrderCollectibleCollateralProtectionView | null {
  const { projection, account, verifiedAllocation, now } = input;
  if (!projection.hasCollateralContext || !projection.signedFeaturesValid) {
    return null;
  }
  if (!projection.collateralAmount?.trim() && !projection.collateralAssetID?.trim()) {
    return null;
  }

  const deposit = {
    guaranteeAmount: projection.collateralAmount,
    guaranteeCurrency: projection.collateralAssetID,
    collateralRequirementStatus: undefined,
  };

  if (verifiedAllocation) {
    return {
      projection,
      deposit,
      verifiedAllocation,
      status: 'verified-allocation',
    };
  }

  return {
    projection,
    deposit,
    account,
    status: resolveCollectibleDepositProtectionStatus({ deposit, account, now }),
  };
}
