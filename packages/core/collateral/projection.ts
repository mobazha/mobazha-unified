// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { ethers } from 'ethers';
import {
  isCanonicalPaymentCoin,
  mustAssetIdFromTokenId,
  parseCanonicalPaymentCoin,
} from '../data/tokens';
import type { CollectibleSourceDeposit } from '../collectibles/types';
import type {
  CollateralAccount,
  CollateralCapabilities,
  CollateralProtectionStatus,
} from './types';
import { resolveCollateralProtectionStatus } from './status';

export type CollateralProtectionStatusI18nKey =
  `collectibles.collateral.protection.status.${CollateralProtectionStatus}`;

export function resolveCollateralProtectionStatusI18nKey(
  status: CollateralProtectionStatus
): CollateralProtectionStatusI18nKey {
  return `collectibles.collateral.protection.status.${status}`;
}

export function resolveGuaranteeAssetID(guaranteeCurrency: string | undefined): string | undefined {
  const trimmed = guaranteeCurrency?.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase().startsWith('crypto:')) {
    return isCanonicalPaymentCoin(trimmed) ? trimmed : undefined;
  }
  try {
    const assetID = mustAssetIdFromTokenId(trimmed);
    return isCanonicalPaymentCoin(assetID) ? assetID : undefined;
  } catch {
    return undefined;
  }
}

/** Strict gate for signed collateral_asset_id order features (eip155 ERC-20 only). */
export function isCanonicalCollateralAssetID(assetID: string | undefined): boolean {
  const trimmed = assetID?.trim();
  if (!trimmed || !isCanonicalPaymentCoin(trimmed)) return false;

  const parsed = parseCanonicalPaymentCoin(trimmed);
  if (!parsed || parsed.namespace !== 'eip155' || parsed.standard !== 'erc20') {
    return false;
  }

  const chainRef = parsed.chainRef;
  if (!chainRef || chainRef !== chainRef.trim() || !isCanonicalPositiveIntegerAmount(chainRef)) {
    return false;
  }

  const address = parsed.assetRef?.trim();
  if (!address || !ethers.isAddress(address)) {
    return false;
  }

  return true;
}

/** Strictly positive canonical decimal integer (no leading zeros). */
const CANONICAL_POSITIVE_INT = /^[1-9]\d*$/;

export function isCanonicalPositiveIntegerAmount(amount: string): boolean {
  return CANONICAL_POSITIVE_INT.test(amount);
}

export type CollectibleCollateralDeclarationIssue =
  | 'missingAmount'
  | 'missingAsset'
  | 'invalidAmountFormat'
  | 'nonPositiveAmount';

export type CollectibleCollateralDeclarationIssueI18nKey =
  `collectibles.collateral.funding.invalidDeclaration.${CollectibleCollateralDeclarationIssue}`;

export function resolveCollectibleCollateralDeclarationIssueKey(
  issue: CollectibleCollateralDeclarationIssue
): CollectibleCollateralDeclarationIssueI18nKey {
  return `collectibles.collateral.funding.invalidDeclaration.${issue}`;
}

export function hasAnyCollectibleCollateralFields(
  deposit: Pick<
    CollectibleSourceDeposit,
    'guaranteeAmount' | 'guaranteeCurrency' | 'collateralRequirementStatus'
  >
): boolean {
  return Boolean(
    deposit.guaranteeAmount?.trim() ||
    deposit.guaranteeCurrency?.trim() ||
    deposit.collateralRequirementStatus?.trim()
  );
}

/** True when either guarantee field is non-empty — triggers fail-closed declaration validation. */
export function hasCollateralDeclarationAttempt(
  deposit: Pick<CollectibleSourceDeposit, 'guaranteeAmount' | 'guaranteeCurrency'>
): boolean {
  return Boolean(deposit.guaranteeAmount?.trim() || deposit.guaranteeCurrency?.trim());
}

export function validateCollectibleCollateralDeclaration(
  deposit: Pick<CollectibleSourceDeposit, 'guaranteeAmount' | 'guaranteeCurrency'>
): { valid: true } | { valid: false; issue: CollectibleCollateralDeclarationIssue } {
  const rawAmount = deposit.guaranteeAmount?.trim() ?? '';
  const rawCurrency = deposit.guaranteeCurrency?.trim() ?? '';
  const hasAmount = Boolean(rawAmount);
  const hasCurrency = Boolean(rawCurrency);

  if (!hasAmount && !hasCurrency) {
    return { valid: false, issue: 'missingAmount' };
  }
  if (!hasAmount) {
    return { valid: false, issue: 'missingAmount' };
  }
  if (!hasCurrency) {
    return { valid: false, issue: 'missingAsset' };
  }
  if (!/^\d+$/.test(rawAmount)) {
    return { valid: false, issue: 'invalidAmountFormat' };
  }
  if (!isCanonicalPositiveIntegerAmount(rawAmount)) {
    return { valid: false, issue: 'nonPositiveAmount' };
  }
  if (!resolveGuaranteeAssetID(rawCurrency)) {
    return { valid: false, issue: 'missingAsset' };
  }
  return { valid: true };
}

export function hasCollectibleCollateralDeclaration(
  deposit: Pick<CollectibleSourceDeposit, 'guaranteeAmount' | 'guaranteeCurrency'>
): boolean {
  const rawAmount = deposit.guaranteeAmount?.trim() ?? '';
  const rawCurrency = deposit.guaranteeCurrency?.trim() ?? '';
  if (!rawAmount || !rawCurrency) {
    return false;
  }
  return validateCollectibleCollateralDeclaration(deposit).valid;
}

export function buildCollectibleDepositProtectionInput(input: {
  deposit: Pick<
    CollectibleSourceDeposit,
    'guaranteeAmount' | 'guaranteeCurrency' | 'collateralRequirementStatus'
  >;
  account?: CollateralAccount | null;
  now?: Date;
}) {
  return {
    requirementStatus: input.deposit.collateralRequirementStatus,
    guaranteeAmount: input.deposit.guaranteeAmount,
    guaranteeAssetID: resolveGuaranteeAssetID(input.deposit.guaranteeCurrency),
    account: input.account,
    now: input.now,
  };
}

export function resolveCollectibleDepositProtectionStatus(input: {
  deposit: Pick<
    CollectibleSourceDeposit,
    'guaranteeAmount' | 'guaranteeCurrency' | 'collateralRequirementStatus'
  >;
  account?: CollateralAccount | null;
  now?: Date;
}): CollateralProtectionStatus {
  return resolveCollateralProtectionStatus(buildCollectibleDepositProtectionInput(input));
}

export function defaultCollectibleCollateralExpiresAt(from = new Date()): string {
  const expiresAt = new Date(from.getTime());
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 365);
  return expiresAt.toISOString();
}

export type CollectibleCollateralExpiryIssue = 'missingCreatedAt' | 'invalidCreatedAt';

export type CollectibleCollateralExpiryIssueI18nKey =
  `collectibles.collateral.funding.${CollectibleCollateralExpiryIssue}`;

export function resolveCollectibleCollateralExpiryIssueKey(
  issue: CollectibleCollateralExpiryIssue
): CollectibleCollateralExpiryIssueI18nKey {
  return `collectibles.collateral.funding.${issue}`;
}

/** Derive deterministic collateral expiry from immutable source-deposit createdAt. */
export function resolveCollectibleCollateralExpiresAt(
  createdAt: string | undefined
): { valid: true; expiresAt: string } | { valid: false; issue: CollectibleCollateralExpiryIssue } {
  const trimmed = createdAt?.trim();
  if (!trimmed) {
    return { valid: false, issue: 'missingCreatedAt' };
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return { valid: false, issue: 'invalidCreatedAt' };
  }
  return { valid: true, expiresAt: defaultCollectibleCollateralExpiresAt(new Date(parsed)) };
}

export const COLLATERAL_OPEN_IDEMPOTENCY_PREFIX = 'open:';

export function buildCollateralOpenIdempotencyKey(input: {
  sourceDepositID: string;
  assetID: string;
  requiredAmount: string;
  policyID: string;
  policyVersion: string;
  expiresAt: string;
}): string {
  const digest = ethers
    .keccak256(
      ethers.toUtf8Bytes(
        [
          input.sourceDepositID.trim(),
          input.assetID.trim(),
          input.requiredAmount.trim(),
          input.policyID.trim(),
          input.policyVersion.trim(),
          input.expiresAt.trim(),
        ].join('\x1f')
      )
    )
    .slice(2);
  const key = `${COLLATERAL_OPEN_IDEMPOTENCY_PREFIX}${digest}`;
  if (key.length > COLLATERAL_FUNDING_IDEMPOTENCY_MAX_BYTES) {
    throw new Error('Collateral open idempotency key exceeds maximum length.');
  }
  return key;
}

/** Exact-match gate — do not guess asset ID casing or aliases. */
export function isCollateralRailAssetSupported(
  capabilities: CollateralCapabilities | null | undefined,
  assetID: string | undefined
): boolean {
  const normalizedAssetID = assetID?.trim();
  if (!capabilities?.available || !capabilities.rail || !normalizedAssetID) {
    return false;
  }
  return capabilities.rail.assets.some(asset => asset === normalizedAssetID);
}

export const COLLATERAL_FUNDING_IDEMPOTENCY_PREFIX = 'fund:';
export const COLLATERAL_FUNDING_IDEMPOTENCY_MAX_BYTES = 192;

export function buildCollateralFundingIdempotencyKey(input: {
  sourceDepositID: string;
  collateralID: string;
  principalDestination: string;
}): string {
  const sourceDepositID = input.sourceDepositID.trim();
  const collateralID = input.collateralID.trim();
  const principal = input.principalDestination.trim().toLowerCase();
  const digest = ethers
    .keccak256(ethers.toUtf8Bytes(`${sourceDepositID}\x1f${collateralID}\x1f${principal}`))
    .slice(2);
  const key = `${COLLATERAL_FUNDING_IDEMPOTENCY_PREFIX}${digest}`;
  if (key.length > COLLATERAL_FUNDING_IDEMPOTENCY_MAX_BYTES) {
    throw new Error('Collateral funding idempotency key exceeds maximum length.');
  }
  return key;
}
