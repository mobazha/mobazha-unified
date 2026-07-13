// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import {
  COLLECTIBLES_SOURCE_CUSTODY_POLICY_ID,
  COLLECTIBLES_SOURCE_CUSTODY_POLICY_VERSION,
} from '../collateral/constants';
import {
  isCanonicalPositiveIntegerAmount,
  isCanonicalCollateralAssetID,
  type CollectibleCollateralDeclarationIssue,
} from '../collateral/projection';
import {
  buildCollectibleListingTagEntries,
  COLLECTIBLE_LISTING_TAG_MAX_LEN,
  collectibleListingCanonicalTag,
  parseCollectibleListingTagMap,
} from './listingTags';

/** Signed-order optional feature prefix — distinct from listing-form OptionalFeature[]. */
export const COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX = 'collectibles.';

export const COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS = {
  sourceDepositId: 'source_deposit_id',
  collateralAssetId: 'collateral_asset_id',
  collateralAmount: 'collateral_amount',
  collateralPolicyId: 'collateral_policy_id',
  collateralPolicyVersion: 'collateral_policy_version',
  fulfillment: 'fulfillment',
  hubSlotId: 'hub_slot_id',
  certNumber: 'cert_number',
  hubLocation: 'hub_location',
  grade: 'grade',
  serial: 'serial',
  nftMint: 'nft_mint',
  holderWallet: 'holder_wallet',
} as const;

export type CollectibleOrderOptionalFeatureKey =
  (typeof COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS)[keyof typeof COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS];

export const REQUIRED_COLLATERAL_ORDER_FEATURE_KEYS = [
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.sourceDepositId,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyId,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyVersion,
] as const;

const ALLOWED_ORDER_OPTIONAL_FEATURE_KEYS = new Set<string>(
  Object.values(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS)
);

const URL_ORDER_FEATURE_PARAM = 'orderFeature';

export type CollectibleOrderOptionalFeaturesIssue =
  | 'invalidFeatureFormat'
  | 'duplicateKey'
  | 'disallowedKey'
  | 'partialCollateralSet'
  | 'missingCollateralBindings'
  | 'invalidCollateralAmount'
  | 'invalidCollateralAsset'
  | 'invalidGuaranteeAmount'
  | 'invalidGuaranteeAsset'
  | 'guaranteeAmountMismatch'
  | 'guaranteeAssetMismatch'
  | 'collateralPolicyIdMismatch'
  | 'collateralPolicyVersionMismatch'
  | 'invalidCollectibleSurcharge'
  | 'sourceDepositMismatch'
  | 'hubSlotMismatch'
  | 'certNumberMismatch'
  | 'incompleteSourceDepositContext';

export function mapCollateralDeclarationIssueToOrderFeatureIssue(
  issue: CollectibleCollateralDeclarationIssue
): CollectibleOrderOptionalFeaturesIssue {
  switch (issue) {
    case 'missingAmount':
    case 'invalidAmountFormat':
    case 'nonPositiveAmount':
      return 'invalidGuaranteeAmount';
    case 'missingAsset':
      return 'invalidGuaranteeAsset';
  }
}

/** Zero-surcharge signed listing optional features for collectibles order extensions. */
export const COLLECTIBLE_ZERO_ORDER_FEATURE_SURCHARGE = '0';

export function parseCollectibleOrderOptionalFeature(
  feature: string
): { key: string; value: string } | null {
  const trimmed = feature.trim();
  if (!trimmed.startsWith(COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX)) return null;
  const body = trimmed.slice(COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX.length);
  const eq = body.indexOf('=');
  if (eq <= 0) return null;
  const key = body.slice(0, eq).trim();
  const value = body.slice(eq + 1).trim();
  if (!key || !value) return null;
  return { key, value };
}

function hasCollateralFeatureKey(keys: Set<string>): boolean {
  return REQUIRED_COLLATERAL_ORDER_FEATURE_KEYS.some(key => keys.has(key));
}

export type OrderItemCollateralProjectionValidation =
  | { status: 'absent' }
  | { status: 'valid'; values: Map<string, string> }
  | { status: 'invalid'; issue: CollectibleOrderOptionalFeaturesIssue };

/** Validate only the signed collateral binding subset from order item optional features. */
export function validateOrderItemCollateralProjectionFeatures(
  features: readonly string[]
): OrderItemCollateralProjectionValidation {
  const collateralValues = new Map<string, string>();
  let hasAnyCollateralKey = false;

  for (const feature of features) {
    const trimmed = feature.trim();
    if (!trimmed) continue;

    const parsed = parseCollectibleOrderOptionalFeature(trimmed);
    if (!parsed) {
      if (trimmed.startsWith(COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX)) {
        return { status: 'invalid', issue: 'invalidFeatureFormat' };
      }
      continue;
    }

    if (!(REQUIRED_COLLATERAL_ORDER_FEATURE_KEYS as readonly string[]).includes(parsed.key)) {
      continue;
    }

    hasAnyCollateralKey = true;
    const existing = collateralValues.get(parsed.key);
    if (existing !== undefined) {
      return { status: 'invalid', issue: 'duplicateKey' };
    }
    collateralValues.set(parsed.key, parsed.value);
  }

  if (!hasAnyCollateralKey) {
    return { status: 'absent' };
  }

  const keys = new Set(collateralValues.keys());
  if (!hasCompleteCollateralFeatureSet(keys)) {
    return { status: 'invalid', issue: 'partialCollateralSet' };
  }

  const collateralIssue = validateCollateralFeatureValues(collateralValues);
  if (collateralIssue) {
    return { status: 'invalid', issue: collateralIssue };
  }

  return { status: 'valid', values: collateralValues };
}

function validateCollateralFeatureValues(
  values: Map<string, string>
): CollectibleOrderOptionalFeaturesIssue | null {
  const amount = values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount);
  if (!amount || !/^\d+$/.test(amount) || !isCanonicalPositiveIntegerAmount(amount)) {
    return 'invalidCollateralAmount';
  }
  const asset = values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId);
  if (!asset || !isCanonicalCollateralAssetID(asset)) {
    return 'invalidCollateralAsset';
  }
  const policyId = values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyId);
  if (policyId !== COLLECTIBLES_SOURCE_CUSTODY_POLICY_ID) {
    return 'collateralPolicyIdMismatch';
  }
  const policyVersion = values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyVersion);
  if (policyVersion !== COLLECTIBLES_SOURCE_CUSTODY_POLICY_VERSION) {
    return 'collateralPolicyVersionMismatch';
  }
  return null;
}

function hasCompleteCollateralFeatureSet(keys: Set<string>): boolean {
  return REQUIRED_COLLATERAL_ORDER_FEATURE_KEYS.every(key => keys.has(key));
}

function validateRequiredCollateralGuaranteeMatch(
  values: Map<string, string>,
  binding: {
    requiredCollateralAmount: string;
    requiredCollateralAssetID: string;
  }
): CollectibleOrderOptionalFeaturesIssue | null {
  const amount = values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount);
  const asset = values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId);
  if (amount !== binding.requiredCollateralAmount) {
    return 'guaranteeAmountMismatch';
  }
  if (asset !== binding.requiredCollateralAssetID) {
    return 'guaranteeAssetMismatch';
  }
  return null;
}

export function validateCollectibleOrderOptionalFeatures(
  features: readonly string[],
  binding?: {
    sourceDepositID?: string;
    hubSlotID?: string;
    certNumber?: string;
    requiredCollateralAmount?: string;
    requiredCollateralAssetID?: string;
  }
):
  | { valid: true; features: string[] }
  | { valid: false; issue: CollectibleOrderOptionalFeaturesIssue } {
  const normalized = features.map(feature => feature.trim()).filter(Boolean);
  const values = new Map<string, string>();
  const canonical: string[] = [];

  for (const feature of normalized) {
    const parsed = parseCollectibleOrderOptionalFeature(feature);
    if (!parsed) {
      return { valid: false, issue: 'invalidFeatureFormat' };
    }
    if (!ALLOWED_ORDER_OPTIONAL_FEATURE_KEYS.has(parsed.key)) {
      return { valid: false, issue: 'disallowedKey' };
    }
    if (values.has(parsed.key)) {
      return { valid: false, issue: 'duplicateKey' };
    }
    values.set(parsed.key, parsed.value);
    canonical.push(collectibleListingCanonicalTag(parsed.key, parsed.value));
  }

  const keys = new Set(values.keys());
  const collateralRequired = Boolean(
    binding?.requiredCollateralAmount && binding?.requiredCollateralAssetID
  );
  const collateralKeysPresent = REQUIRED_COLLATERAL_ORDER_FEATURE_KEYS.filter(key => keys.has(key));
  if (
    collateralKeysPresent.length > 0 &&
    collateralKeysPresent.length < REQUIRED_COLLATERAL_ORDER_FEATURE_KEYS.length
  ) {
    return { valid: false, issue: 'partialCollateralSet' };
  }

  if (collateralRequired && !hasCompleteCollateralFeatureSet(keys)) {
    return { valid: false, issue: 'missingCollateralBindings' };
  }

  if (hasCollateralFeatureKey(keys)) {
    const collateralIssue = validateCollateralFeatureValues(values);
    if (collateralIssue) {
      return { valid: false, issue: collateralIssue };
    }
  }

  if (collateralRequired) {
    const guaranteeMatchIssue = validateRequiredCollateralGuaranteeMatch(values, {
      requiredCollateralAmount: binding!.requiredCollateralAmount!,
      requiredCollateralAssetID: binding!.requiredCollateralAssetID!,
    });
    if (guaranteeMatchIssue) {
      return { valid: false, issue: guaranteeMatchIssue };
    }
  }

  const sourceDepositID = binding?.sourceDepositID?.trim();
  const boundSourceDeposit = values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.sourceDepositId);
  if (sourceDepositID && boundSourceDeposit && boundSourceDeposit !== sourceDepositID) {
    return { valid: false, issue: 'sourceDepositMismatch' };
  }

  const hubSlotID = binding?.hubSlotID?.trim();
  const boundHubSlot = values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId);
  if (hubSlotID && boundHubSlot && boundHubSlot !== hubSlotID) {
    return { valid: false, issue: 'hubSlotMismatch' };
  }

  const certNumber = binding?.certNumber?.trim();
  const boundCert = values.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber);
  if (certNumber && boundCert && boundCert !== certNumber) {
    return { valid: false, issue: 'certNumberMismatch' };
  }

  return { valid: true, features: sortCollectibleOrderOptionalFeatures(canonical) };
}

/** Deterministic ordering for URL round-trip. */
export function sortCollectibleOrderOptionalFeatures(features: readonly string[]): string[] {
  return [...features]
    .map(feature => feature.trim())
    .filter(Boolean)
    .sort();
}

export function appendOrderOptionalFeaturesToSearchParams(
  params: URLSearchParams,
  features: readonly string[]
): void {
  params.delete(URL_ORDER_FEATURE_PARAM);
  for (const feature of sortCollectibleOrderOptionalFeatures(features)) {
    params.append(URL_ORDER_FEATURE_PARAM, feature);
  }
}

export function readOrderOptionalFeaturesFromSearchParams(
  params: Pick<URLSearchParams, 'getAll'>
): string[] {
  return params
    .getAll(URL_ORDER_FEATURE_PARAM)
    .map(feature => feature.trim())
    .filter(Boolean);
}

export function orderOptionalFeaturesToListingTags(features: readonly string[]): string[] {
  const tags: string[] = [];
  for (const feature of sortCollectibleOrderOptionalFeatures(features)) {
    const parsed = parseCollectibleOrderOptionalFeature(feature);
    if (!parsed) continue;
    const entries = buildCollectibleListingTagEntries(parsed.key, parsed.value);
    if (!entries.length) {
      throw new Error(
        `Unable to encode collectible order optional feature for key "${parsed.key}"`
      );
    }
    for (const entry of entries) {
      if (entry.length > COLLECTIBLE_LISTING_TAG_MAX_LEN) {
        throw new Error(
          `Collectible order optional feature exceeds listing tag limit for "${parsed.key}"`
        );
      }
      tags.push(entry);
    }
  }
  return tags;
}

/** Reconstruct signed-order optional features from authoritative listing tags. */
export function listingTagsToOrderOptionalFeatures(tags: readonly string[]): string[] {
  const map = parseCollectibleListingTagMap(tags);
  const features: string[] = [];
  for (const key of ALLOWED_ORDER_OPTIONAL_FEATURE_KEYS) {
    const value = map[key]?.trim();
    if (!value) continue;
    features.push(collectibleListingCanonicalTag(key, value));
  }
  return sortCollectibleOrderOptionalFeatures(features);
}

export function hasCollateralOrderOptionalFeatures(features: readonly string[]): boolean {
  return features.some(feature => {
    const parsed = parseCollectibleOrderOptionalFeature(feature);
    if (!parsed) return false;
    return (REQUIRED_COLLATERAL_ORDER_FEATURE_KEYS as readonly string[]).includes(parsed.key);
  });
}

/**
 * Backend-faithful signed listing Item.OptionalFeature entry for collectibles bindings.
 * Protobuf schema: name, surcharge, skuID, images — not description/price.
 */
export interface CollectibleSignedListingOptionalFeature {
  name: string;
  surcharge: string;
}

export type CollectibleOrderOptionalFeaturesIssueI18nKey =
  `collectibles.orderOptionalFeatures.issue.${CollectibleOrderOptionalFeaturesIssue}`;

export function resolveCollectibleOrderOptionalFeaturesIssueKey(
  issue: CollectibleOrderOptionalFeaturesIssue
): CollectibleOrderOptionalFeaturesIssueI18nKey {
  return `collectibles.orderOptionalFeatures.issue.${issue}`;
}

function isCollectibleSignedOrderOptionalFeatureName(name: string): boolean {
  return name.trim().startsWith(COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX);
}

type SignedListingOptionalFeatureInput =
  | CollectibleSignedListingOptionalFeature
  | string
  | { name?: string; surcharge?: string; description?: string; price?: number };

/** Read canonical signed-order feature strings from listing.item.optionalFeatures. */
export function extractSignedOrderOptionalFeatureNames(
  optionalFeatures: readonly SignedListingOptionalFeatureInput[] | null | undefined
): string[] {
  if (!optionalFeatures?.length) return [];
  const names: string[] = [];
  for (const entry of optionalFeatures) {
    const name =
      typeof entry === 'string'
        ? entry.trim()
        : typeof entry?.name === 'string'
          ? entry.name.trim()
          : '';
    if (!name) continue;
    names.push(name);
  }
  return names;
}

/** Encode validated collectibles bindings into zero-surcharge signed listing optional features. */
export function orderOptionalFeaturesToSignedListingEntries(
  features: readonly string[]
): CollectibleSignedListingOptionalFeature[] {
  const validated = validateCollectibleOrderOptionalFeatures(features);
  if (!validated.valid) {
    throw new Error(`Invalid collectible order optional features (${validated.issue}).`);
  }
  return validated.features.map(name => ({
    name,
    surcharge: COLLECTIBLE_ZERO_ORDER_FEATURE_SURCHARGE,
  }));
}

function readCollectibleSignedOrderOptionalFeatureNames(
  optionalFeatures: readonly SignedListingOptionalFeatureInput[] | null | undefined
):
  | { valid: true; names: string[] }
  | { valid: false; issue: CollectibleOrderOptionalFeaturesIssue } {
  if (!optionalFeatures?.length) {
    return { valid: true, names: [] };
  }

  const collectibleNames: string[] = [];
  for (const entry of optionalFeatures) {
    if (typeof entry === 'string') {
      const name = entry.trim();
      if (!name) continue;
      if (isCollectibleSignedOrderOptionalFeatureName(name)) {
        return { valid: false, issue: 'invalidCollectibleSurcharge' };
      }
      continue;
    }

    const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
    if (!name) continue;
    if (!isCollectibleSignedOrderOptionalFeatureName(name)) {
      continue;
    }

    const surcharge =
      typeof entry.surcharge === 'number'
        ? String(entry.surcharge)
        : typeof entry.surcharge === 'string'
          ? entry.surcharge.trim()
          : '';
    if (surcharge !== COLLECTIBLE_ZERO_ORDER_FEATURE_SURCHARGE) {
      return { valid: false, issue: 'invalidCollectibleSurcharge' };
    }

    collectibleNames.push(name);
  }

  return { valid: true, names: collectibleNames };
}

export function readCollectibleSignedOrderOptionalFeatures(
  optionalFeatures: readonly SignedListingOptionalFeatureInput[] | null | undefined,
  binding?: {
    sourceDepositID?: string;
    hubSlotID?: string;
    certNumber?: string;
    requiredCollateralAmount?: string;
    requiredCollateralAssetID?: string;
  }
):
  | { valid: true; features: string[] }
  | { valid: false; issue: CollectibleOrderOptionalFeaturesIssue } {
  const extracted = readCollectibleSignedOrderOptionalFeatureNames(optionalFeatures);
  if (!extracted.valid) {
    return extracted;
  }
  if (!extracted.names.length) {
    return { valid: true, features: [] };
  }
  return validateCollectibleOrderOptionalFeatures(extracted.names, binding);
}
