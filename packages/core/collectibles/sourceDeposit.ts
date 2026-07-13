// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { CollectibleSourceDeposit } from './types';
import {
  hasCollateralDeclarationAttempt,
  resolveGuaranteeAssetID,
  validateCollectibleCollateralDeclaration,
} from '../collateral/projection';
import {
  buildCollectibleListingTagEntries,
  COLLECTIBLE_LISTING_TAG_MAX_COUNT,
  COLLECTIBLE_LISTING_TAG_MAX_LEN,
} from './listingTags';
import {
  appendOrderOptionalFeaturesToSearchParams,
  mapCollateralDeclarationIssueToOrderFeatureIssue,
  readOrderOptionalFeaturesFromSearchParams,
  type CollectibleOrderOptionalFeaturesIssue,
  validateCollectibleOrderOptionalFeatures,
} from './orderOptionalFeatures';

export type SourceDepositLifecycleStep = 'submit' | 'review' | 'list' | 'listed' | 'redeem';

export type SourceDepositStatusI18nKey =
  | 'collectibles.sourceDeposit.status.submitted'
  | 'collectibles.sourceDeposit.status.sourceHeld'
  | 'collectibles.sourceDeposit.status.rejected'
  | 'collectibles.sourceDeposit.status.minting'
  | 'collectibles.sourceDeposit.status.minted'
  | 'collectibles.sourceDeposit.status.inCirculation'
  | 'collectibles.sourceDeposit.status.redeemRequested'
  | 'collectibles.sourceDeposit.status.shipped'
  | 'collectibles.sourceDeposit.status.settled'
  | 'collectibles.sourceDeposit.status.defaulted'
  | 'collectibles.sourceDeposit.status.unknown';

export type SourceDepositNextActionI18nKey =
  | 'collectibles.sourceDeposit.nextAction.submitted'
  | 'collectibles.sourceDeposit.nextAction.sourceHeld'
  | 'collectibles.sourceDeposit.nextAction.rejected'
  | 'collectibles.sourceDeposit.nextAction.minting'
  | 'collectibles.sourceDeposit.nextAction.minted'
  | 'collectibles.sourceDeposit.nextAction.inCirculation'
  | 'collectibles.sourceDeposit.nextAction.redeemRequested'
  | 'collectibles.sourceDeposit.nextAction.shipped'
  | 'collectibles.sourceDeposit.nextAction.settled'
  | 'collectibles.sourceDeposit.nextAction.defaulted'
  | 'collectibles.sourceDeposit.nextAction.unknown';

export type SourceDepositOperatorNextActionI18nKey =
  | 'collectibles.sourceDeposit.operatorNext.review'
  | 'collectibles.sourceDeposit.operatorNext.awaitingListing'
  | 'collectibles.sourceDeposit.operatorNext.mint'
  | 'collectibles.sourceDeposit.operatorNext.firstSale'
  | 'collectibles.sourceDeposit.operatorNext.ship'
  | 'collectibles.sourceDeposit.operatorNext.settle'
  | 'collectibles.sourceDeposit.operatorNext.complete'
  | 'collectibles.sourceDeposit.operatorNext.rejected'
  | 'collectibles.sourceDeposit.operatorNext.defaultRefundPending'
  | 'collectibles.sourceDeposit.operatorNext.defaultRefundFailed';

export type SourceDepositDefaultRefundStatusI18nKey =
  | 'collectibles.sourceDeposit.defaultRefund.status.pending'
  | 'collectibles.sourceDeposit.defaultRefund.status.refunded'
  | 'collectibles.sourceDeposit.defaultRefund.status.failed'
  | 'collectibles.sourceDeposit.defaultRefund.status.unknown';

export type SourceDepositDefaultActionOutcome =
  | 'defaulted'
  | 'refundPending'
  | 'refundFailed'
  | 'none';

function normalizeStatus(status: string | undefined): string {
  return (status ?? '').trim().toLowerCase();
}

export function resolveSourceDepositStatusKey(
  status: string | undefined
): SourceDepositStatusI18nKey {
  switch (normalizeStatus(status)) {
    case 'submitted':
      return 'collectibles.sourceDeposit.status.submitted';
    case 'source_held':
      return 'collectibles.sourceDeposit.status.sourceHeld';
    case 'rejected':
      return 'collectibles.sourceDeposit.status.rejected';
    case 'minting':
      return 'collectibles.sourceDeposit.status.minting';
    case 'minted':
      return 'collectibles.sourceDeposit.status.minted';
    case 'in_circulation':
      return 'collectibles.sourceDeposit.status.inCirculation';
    case 'redeem_requested':
      return 'collectibles.sourceDeposit.status.redeemRequested';
    case 'shipped':
      return 'collectibles.sourceDeposit.status.shipped';
    case 'settled':
      return 'collectibles.sourceDeposit.status.settled';
    case 'defaulted':
      return 'collectibles.sourceDeposit.status.defaulted';
    default:
      return 'collectibles.sourceDeposit.status.unknown';
  }
}

export function resolveSourceDepositNextActionKey(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): SourceDepositNextActionI18nKey {
  switch (normalizeStatus(deposit.status)) {
    case 'submitted':
      return 'collectibles.sourceDeposit.nextAction.submitted';
    case 'source_held':
      return 'collectibles.sourceDeposit.nextAction.sourceHeld';
    case 'rejected':
      return 'collectibles.sourceDeposit.nextAction.rejected';
    case 'minting':
      return 'collectibles.sourceDeposit.nextAction.minting';
    case 'minted':
      return 'collectibles.sourceDeposit.nextAction.minted';
    case 'in_circulation':
      return 'collectibles.sourceDeposit.nextAction.inCirculation';
    case 'redeem_requested':
      return 'collectibles.sourceDeposit.nextAction.redeemRequested';
    case 'shipped':
      return 'collectibles.sourceDeposit.nextAction.shipped';
    case 'settled':
      return 'collectibles.sourceDeposit.nextAction.settled';
    case 'defaulted':
      return 'collectibles.sourceDeposit.nextAction.defaulted';
    default:
      return 'collectibles.sourceDeposit.nextAction.unknown';
  }
}

function hasNonEmptyField(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function resolveSourceDepositDefaultRefundStatusKey(
  refundStatus: string | undefined
): SourceDepositDefaultRefundStatusI18nKey | null {
  const normalized = normalizeStatus(refundStatus);
  if (!normalized) return null;
  switch (normalized) {
    case 'pending':
      return 'collectibles.sourceDeposit.defaultRefund.status.pending';
    case 'refunded':
      return 'collectibles.sourceDeposit.defaultRefund.status.refunded';
    case 'failed':
      return 'collectibles.sourceDeposit.defaultRefund.status.failed';
    default:
      return 'collectibles.sourceDeposit.defaultRefund.status.unknown';
  }
}

export function isSourceDepositDefaultRefundPending(
  deposit: Pick<CollectibleSourceDeposit, 'defaultRefundStatus'>
): boolean {
  return normalizeStatus(deposit.defaultRefundStatus) === 'pending';
}

export function isSourceDepositDefaultRefundFailed(
  deposit: Pick<CollectibleSourceDeposit, 'defaultRefundStatus'>
): boolean {
  return normalizeStatus(deposit.defaultRefundStatus) === 'failed';
}

export function isSourceDepositMarkDefaultEligible(
  deposit: Pick<CollectibleSourceDeposit, 'status' | 'defaultRefundStatus'>
): boolean {
  const status = normalizeStatus(deposit.status);
  if (status === 'settled' || status === 'defaulted') return false;
  if (isSourceDepositDefaultRefundPending(deposit)) return false;
  if (isSourceDepositDefaultRefundFailed(deposit)) return false;
  return true;
}

export function isSourceDepositDefaultRefundRefreshEligible(
  deposit: Pick<CollectibleSourceDeposit, 'defaultRefundStatus' | 'status'>
): boolean {
  return (
    isSourceDepositDefaultRefundPending(deposit) && normalizeStatus(deposit.status) !== 'defaulted'
  );
}

export function isSourceDepositDefaultRefundRetryEligible(
  deposit: Pick<CollectibleSourceDeposit, 'defaultRefundStatus' | 'status'>
): boolean {
  return (
    isSourceDepositDefaultRefundFailed(deposit) && normalizeStatus(deposit.status) !== 'defaulted'
  );
}

export function resolveSourceDepositDefaultActionOutcome(
  deposit: Pick<CollectibleSourceDeposit, 'status' | 'defaultRefundStatus'>
): SourceDepositDefaultActionOutcome {
  if (normalizeStatus(deposit.status) === 'defaulted') return 'defaulted';
  const refundStatus = normalizeStatus(deposit.defaultRefundStatus);
  if (refundStatus === 'refunded') return 'defaulted';
  if (refundStatus === 'pending') return 'refundPending';
  if (refundStatus === 'failed') return 'refundFailed';
  return 'none';
}

export function resolveSourceDepositOperatorNextActionKey(
  deposit: Pick<
    CollectibleSourceDeposit,
    'status' | 'firstSaleOrderID' | 'nftMint' | 'defaultRefundStatus'
  >
): SourceDepositOperatorNextActionI18nKey {
  const status = normalizeStatus(deposit.status);
  const refundStatus = normalizeStatus(deposit.defaultRefundStatus);
  if (status !== 'defaulted') {
    if (refundStatus === 'pending') {
      return 'collectibles.sourceDeposit.operatorNext.defaultRefundPending';
    }
    if (refundStatus === 'failed') {
      return 'collectibles.sourceDeposit.operatorNext.defaultRefundFailed';
    }
  }

  switch (status) {
    case 'submitted':
      return 'collectibles.sourceDeposit.operatorNext.review';
    case 'source_held':
      if (hasNonEmptyField(deposit.firstSaleOrderID) && !hasNonEmptyField(deposit.nftMint)) {
        return 'collectibles.sourceDeposit.operatorNext.mint';
      }
      return 'collectibles.sourceDeposit.operatorNext.awaitingListing';
    case 'rejected':
      return 'collectibles.sourceDeposit.operatorNext.rejected';
    case 'minting':
      return 'collectibles.sourceDeposit.operatorNext.mint';
    case 'minted':
    case 'in_circulation':
      return deposit.firstSaleOrderID
        ? 'collectibles.sourceDeposit.operatorNext.complete'
        : 'collectibles.sourceDeposit.operatorNext.firstSale';
    case 'redeem_requested':
      return 'collectibles.sourceDeposit.operatorNext.ship';
    case 'shipped':
      return 'collectibles.sourceDeposit.operatorNext.settle';
    case 'settled':
    case 'defaulted':
      return 'collectibles.sourceDeposit.operatorNext.complete';
    default:
      return 'collectibles.sourceDeposit.operatorNext.complete';
  }
}

export function resolveSourceDepositLifecycleStep(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): SourceDepositLifecycleStep {
  const status = normalizeStatus(deposit.status);
  if (status === 'submitted' || status === 'rejected') return 'review';
  if (status === 'source_held') return 'list';
  if (status === 'minting' || status === 'minted') return 'listed';
  if (status === 'in_circulation') return 'listed';
  if (
    status === 'redeem_requested' ||
    status === 'shipped' ||
    status === 'settled' ||
    status === 'defaulted'
  ) {
    return 'redeem';
  }
  return 'submit';
}

/** Pre-sale mint is not allowed — mint happens on first paid sale. */
export function isSourceDepositMintEligible(
  deposit: Pick<CollectibleSourceDeposit, 'status' | 'firstSaleOrderID' | 'nftMint'>
): boolean {
  const status = normalizeStatus(deposit.status);
  if (status === 'minting') return true;
  if (status !== 'source_held') return false;
  return hasNonEmptyField(deposit.firstSaleOrderID) && !hasNonEmptyField(deposit.nftMint);
}

/** Manual operator recovery when the paid-sale hook did not record first sale. */
export function isSourceDepositRecordFirstSaleEligible(
  deposit: Pick<CollectibleSourceDeposit, 'status' | 'firstSaleOrderID'>
): boolean {
  if (normalizeStatus(deposit.status) !== 'source_held') return false;
  return !hasNonEmptyField(deposit.firstSaleOrderID);
}

export function isSourceDepositListingReady(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): boolean {
  return normalizeStatus(deposit.status) === 'source_held';
}

export function resolveSourceDepositRejectionReason(
  deposit: Pick<CollectibleSourceDeposit, 'status' | 'rejectionReason' | 'defaultReason'>
): string | undefined {
  const explicit = deposit.rejectionReason?.trim();
  if (explicit) return explicit;
  if (normalizeStatus(deposit.status) === 'rejected') {
    return deposit.defaultReason?.trim() || undefined;
  }
  return undefined;
}

export function isValidCollectibleEvidenceUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export type CollectibleSourceDepositEvidenceSide = 'front' | 'back';

export interface CollectibleSourceDepositEvidencePhoto {
  side: CollectibleSourceDepositEvidenceSide;
  url: string;
}

const SOURCE_DEPOSIT_EVIDENCE_SIDES: CollectibleSourceDepositEvidenceSide[] = ['front', 'back'];

/** Parses seller submission photosJSON — index 0 = front, 1 = back. Invalid entries are skipped. */
export function parseCollectibleSourceDepositPhotosJSON(
  photosJSON: string | undefined | null
): CollectibleSourceDepositEvidencePhoto[] {
  if (!photosJSON?.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(photosJSON);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const photos: CollectibleSourceDepositEvidencePhoto[] = [];
  for (
    let index = 0;
    index < parsed.length && index < SOURCE_DEPOSIT_EVIDENCE_SIDES.length;
    index++
  ) {
    const entry = parsed[index];
    if (typeof entry !== 'string') continue;
    const url = entry.trim();
    if (!isValidCollectibleEvidenceUrl(url)) continue;
    photos.push({ side: SOURCE_DEPOSIT_EVIDENCE_SIDES[index], url });
  }

  return photos;
}

export interface CollectibleSourceDepositSubmissionFields {
  certNumber: string;
  grade: string;
  photoFrontUrl: string;
  photoBackUrl: string;
  holderWallet?: string;
  guaranteeAmount?: string;
  guaranteeCurrency?: string;
}

export interface CollectibleSourceDepositSubmissionValidation {
  valid: boolean;
  errors: Partial<
    Record<
      | 'certNumber'
      | 'grade'
      | 'holderWallet'
      | 'photoFrontUrl'
      | 'photoBackUrl'
      | 'photosDistinct'
      | 'guaranteeAmount'
      | 'guaranteeCurrency',
      true
    >
  >;
}

export function validateCollectibleSourceDepositSubmission(
  fields: CollectibleSourceDepositSubmissionFields
): CollectibleSourceDepositSubmissionValidation {
  const certNumber = fields.certNumber.trim();
  const grade = fields.grade.trim();
  const photoFrontUrl = fields.photoFrontUrl.trim();
  const photoBackUrl = fields.photoBackUrl.trim();

  const errors: CollectibleSourceDepositSubmissionValidation['errors'] = {};

  if (!certNumber) errors.certNumber = true;
  if (!grade) errors.grade = true;
  if (!fields.holderWallet?.trim()) errors.holderWallet = true;
  if (!isValidCollectibleEvidenceUrl(photoFrontUrl)) errors.photoFrontUrl = true;
  if (!isValidCollectibleEvidenceUrl(photoBackUrl)) errors.photoBackUrl = true;
  if (
    isValidCollectibleEvidenceUrl(photoFrontUrl) &&
    isValidCollectibleEvidenceUrl(photoBackUrl) &&
    photoFrontUrl === photoBackUrl
  ) {
    errors.photosDistinct = true;
  }

  const guaranteeAmount = fields.guaranteeAmount?.trim() ?? '';
  const guaranteeCurrency = fields.guaranteeCurrency?.trim() ?? '';
  if (guaranteeAmount || guaranteeCurrency) {
    const declaration = validateCollectibleCollateralDeclaration({
      guaranteeAmount,
      guaranteeCurrency,
    });
    if (!declaration.valid) {
      if (declaration.issue === 'missingAmount' || declaration.issue === 'invalidAmountFormat') {
        errors.guaranteeAmount = true;
      }
      if (declaration.issue === 'missingAsset') {
        errors.guaranteeCurrency = true;
      }
      if (declaration.issue === 'nonPositiveAmount') {
        errors.guaranteeAmount = true;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isSourceDepositReviewPending(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): boolean {
  return normalizeStatus(deposit.status) === 'submitted';
}

export function isSourceDepositRejected(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): boolean {
  return normalizeStatus(deposit.status) === 'rejected';
}

export function normalizeWalletAddressForCompare(address: string | undefined | null): string {
  return (address ?? '').trim();
}

export function collectibleHolderMatchesWallet(
  holder: string | undefined | null,
  wallet: string | undefined | null
): boolean {
  const normalizedHolder = normalizeWalletAddressForCompare(holder);
  const normalizedWallet = normalizeWalletAddressForCompare(wallet);
  if (!normalizedHolder || !normalizedWallet) return false;
  return normalizedHolder === normalizedWallet;
}

/** Stable internal listing currency code — satisfies RWA form validation without a mock token. */
export const SOURCE_CUSTODY_LISTING_CRYPTO_CODE = 'COLLECTIBLE_TITLE_SOL';

export interface SourceDepositListingPrefillInput {
  sourceDepositID: string;
  certNumber: string;
  hubSlotID: string;
  grade?: string;
  serial?: string;
  /** Declared seller guarantee — required to fail closed when bindings are absent. */
  guaranteeAmount?: string;
  guaranteeCurrency?: string;
  /** Canonical signed-order optional features from Hosting — not listing-form OptionalFeature[]. */
  orderOptionalFeatures?: readonly string[];
}

export interface SourceDepositListingFormPrefill {
  sourceDepositID: string;
  contractType: 'RWA_TOKEN';
  blockchain: 'SOL';
  tokenStandard: 'metaplex_pnft';
  minQuantity: 1;
  maxQuantity: 1;
  cryptoListingCurrencyCode: typeof SOURCE_CUSTODY_LISTING_CRYPTO_CODE;
  tokenAddress: '';
  tags: string[];
  productType: string;
  guaranteeAmount?: string;
  guaranteeCurrency?: string;
  /** Locked signed-order bindings — distinct from commercial listing-form OptionalFeature[]. */
  sourceDepositOrderOptionalFeatures?: string[];
}

export interface SourceDepositListingBindingInput {
  sourceDepositID: string;
  hubSlotID: string;
  certNumber: string;
  grade?: string;
  serial?: string;
  guaranteeAmount?: string;
  guaranteeCurrency?: string;
  orderOptionalFeatures?: readonly string[];
}

function normalizeSourceDepositListingIdentity(input: SourceDepositListingBindingInput): {
  sourceDepositID: string;
  hubSlotID: string;
  certNumber: string;
} {
  return {
    sourceDepositID: input.sourceDepositID?.trim() ?? '',
    hubSlotID: input.hubSlotID?.trim() ?? '',
    certNumber: input.certNumber?.trim() ?? '',
  };
}

/** True when any source-deposit-specific listing URL param is present. */
export function hasSourceDepositListingUrlContext(
  params: Pick<URLSearchParams, 'get' | 'getAll'>
): boolean {
  const sourceDepositID = params.get('sourceDepositID')?.trim();
  const certNumber = params.get('certNumber')?.trim();
  const hubSlotID = params.get('hubSlotID')?.trim();
  const guaranteeAmount = params.get('guaranteeAmount')?.trim();
  const guaranteeCurrency = params.get('guaranteeCurrency')?.trim();
  const orderFeatures = readOrderOptionalFeaturesFromSearchParams(params);

  const coreSignals =
    Boolean(sourceDepositID) ||
    Boolean(certNumber) ||
    Boolean(hubSlotID) ||
    Boolean(guaranteeAmount) ||
    Boolean(guaranteeCurrency) ||
    orderFeatures.length > 0;

  if (coreSignals) return true;

  return false;
}

/** Fail closed when a guarantee is declared but signed order bindings are missing or invalid. */
export function validateSourceDepositListingBindings(
  input: SourceDepositListingBindingInput
):
  | { valid: true; orderOptionalFeatures?: string[] }
  | { valid: false; issue: CollectibleOrderOptionalFeaturesIssue } {
  const identity = normalizeSourceDepositListingIdentity(input);
  if (!identity.sourceDepositID || !identity.hubSlotID || !identity.certNumber) {
    return { valid: false, issue: 'incompleteSourceDepositContext' };
  }

  const normalizedInput: SourceDepositListingBindingInput = {
    ...input,
    ...identity,
  };

  const declarationAttempt = hasCollateralDeclarationAttempt(normalizedInput);
  if (declarationAttempt) {
    const declaration = validateCollectibleCollateralDeclaration(normalizedInput);
    if (!declaration.valid) {
      return {
        valid: false,
        issue: mapCollateralDeclarationIssueToOrderFeatureIssue(declaration.issue),
      };
    }
  }

  const collateralRequired = declarationAttempt;
  const requiredCollateralAmount = collateralRequired
    ? normalizedInput.guaranteeAmount!.trim()
    : undefined;
  const requiredCollateralAssetID = collateralRequired
    ? resolveGuaranteeAssetID(normalizedInput.guaranteeCurrency)
    : undefined;
  const rawFeatures = normalizedInput.orderOptionalFeatures
    ?.map(feature => feature.trim())
    .filter(Boolean);

  if (!rawFeatures?.length) {
    if (collateralRequired) {
      return { valid: false, issue: 'missingCollateralBindings' };
    }
    return { valid: true };
  }

  const validated = validateCollectibleOrderOptionalFeatures(rawFeatures, {
    sourceDepositID: identity.sourceDepositID,
    hubSlotID: identity.hubSlotID,
    certNumber: identity.certNumber,
    ...(requiredCollateralAmount && requiredCollateralAssetID
      ? { requiredCollateralAmount, requiredCollateralAssetID }
      : {}),
  });
  if (!validated.valid) {
    return validated;
  }
  return { valid: true, orderOptionalFeatures: validated.features };
}

export { buildCollectibleListingTag, buildCollectibleListingTagEntries } from './listingTags';

const SOURCE_DEPOSIT_DISCOVERABILITY_TAGS = [
  'collectible-card',
  'source-custody',
  'trading-cards',
] as const;

function assertCollectibleListingTagLimits(tags: readonly string[], context: string): void {
  for (const tag of tags) {
    if (tag.length > COLLECTIBLE_LISTING_TAG_MAX_LEN) {
      throw new Error(
        `${context}: tag exceeds OpenBazaar ${COLLECTIBLE_LISTING_TAG_MAX_LEN}-character limit (${tag.length} chars).`
      );
    }
  }
  if (tags.length > COLLECTIBLE_LISTING_TAG_MAX_COUNT) {
    throw new Error(
      `${context}: ${tags.length} tags exceed OpenBazaar limit of ${COLLECTIBLE_LISTING_TAG_MAX_COUNT}.`
    );
  }
}

function appendCollectibleListingTagsWithinBudget(
  tags: string[],
  key: string,
  value: string | undefined,
  budget: number
): number {
  const entries = buildCollectibleListingTagEntries(key, value);
  if (!entries.length) return budget;
  if (entries.length > budget) return budget;
  tags.push(...entries);
  return budget - entries.length;
}

function buildUnsecuredSourceDepositListingTags(input: SourceDepositListingPrefillInput): string[] {
  const requiredFields: Array<{ key: string; value: string | undefined; label: string }> = [
    { key: 'fulfillment', value: 'nft', label: 'fulfillment' },
    { key: 'hub_slot_id', value: input.hubSlotID, label: 'hub slot id' },
    { key: 'cert_number', value: input.certNumber, label: 'cert number' },
    { key: 'hub_location', value: 'source-custody', label: 'hub location' },
  ];

  const tags: string[] = [];
  for (const field of requiredFields) {
    const entries = buildCollectibleListingTagEntries(field.key, field.value);
    if (!entries.length) {
      throw new Error(`Source-deposit listing tags: required ${field.label} is missing or empty.`);
    }
    tags.push(...entries);
  }

  assertCollectibleListingTagLimits(
    tags,
    'Source-deposit listing tags: required authoritative fields'
  );

  let budget = COLLECTIBLE_LISTING_TAG_MAX_COUNT - tags.length;

  const optionalFields: Array<{ key: string; value: string | undefined }> = [];
  if (input.grade) optionalFields.push({ key: 'grade', value: input.grade });
  if (input.serial) optionalFields.push({ key: 'serial', value: input.serial });

  for (const field of optionalFields) {
    budget = appendCollectibleListingTagsWithinBudget(tags, field.key, field.value, budget);
  }

  for (const discoverabilityTag of SOURCE_DEPOSIT_DISCOVERABILITY_TAGS) {
    if (budget <= 0) break;
    if (discoverabilityTag.length > COLLECTIBLE_LISTING_TAG_MAX_LEN) continue;
    tags.push(discoverabilityTag);
    budget -= 1;
  }

  assertCollectibleListingTagLimits(tags, 'Source-deposit listing tags');
  return tags;
}

export function buildSourceDepositListingTags(input: SourceDepositListingPrefillInput): string[] {
  const bindings = validateSourceDepositListingBindings(input);
  if (!bindings.valid) {
    throw new Error(
      `Source-deposit listing tags: invalid order optional features (${bindings.issue}).`
    );
  }

  return buildUnsecuredSourceDepositListingTags(input);
}

function resolveValidatedSourceDepositOrderOptionalFeatures(
  input: SourceDepositListingPrefillInput
): string[] | undefined {
  const bindings = validateSourceDepositListingBindings(input);
  if (!bindings.valid) {
    throw new Error(`Invalid source-deposit order optional features (${bindings.issue}).`);
  }
  return bindings.orderOptionalFeatures;
}

export function getSourceDepositLockedTags(input: SourceDepositListingPrefillInput): string[] {
  return buildSourceDepositListingTags(input);
}

export function buildSourceDepositListingFormPrefill(
  input: SourceDepositListingPrefillInput
): SourceDepositListingFormPrefill {
  const sourceDepositOrderOptionalFeatures =
    resolveValidatedSourceDepositOrderOptionalFeatures(input);
  return {
    sourceDepositID: input.sourceDepositID,
    contractType: 'RWA_TOKEN',
    blockchain: 'SOL',
    tokenStandard: 'metaplex_pnft',
    minQuantity: 1,
    maxQuantity: 1,
    cryptoListingCurrencyCode: SOURCE_CUSTODY_LISTING_CRYPTO_CODE,
    tokenAddress: '',
    tags: buildSourceDepositListingTags(input),
    productType: 'collectible-card',
    ...(input.guaranteeAmount?.trim() ? { guaranteeAmount: input.guaranteeAmount.trim() } : {}),
    ...(input.guaranteeCurrency?.trim()
      ? { guaranteeCurrency: input.guaranteeCurrency.trim() }
      : {}),
    ...(sourceDepositOrderOptionalFeatures ? { sourceDepositOrderOptionalFeatures } : {}),
  };
}

export type SourceDepositListingUrlState =
  | { mode: false }
  | {
      mode: true;
      prefill: SourceDepositListingPrefillInput;
      orderFeaturesIssue: null;
    }
  | {
      mode: true;
      prefill: null;
      orderFeaturesIssue: CollectibleOrderOptionalFeaturesIssue;
      partial: {
        sourceDepositID: string;
        certNumber: string;
        hubSlotID: string;
        grade?: string;
        serial?: string;
      };
    };

export function resolveSourceDepositListingUrlState(
  params: Pick<URLSearchParams, 'get' | 'getAll'>
): SourceDepositListingUrlState {
  if (!hasSourceDepositListingUrlContext(params)) {
    return { mode: false };
  }

  const sourceDepositID = params.get('sourceDepositID')?.trim() ?? '';
  const certNumber = params.get('certNumber')?.trim() ?? '';
  const hubSlotID = params.get('hubSlotID')?.trim() ?? '';
  const grade = params.get('grade')?.trim() || undefined;
  const serial = params.get('serial')?.trim() || undefined;
  const guaranteeAmount = params.get('guaranteeAmount')?.trim() || undefined;
  const guaranteeCurrency = params.get('guaranteeCurrency')?.trim() || undefined;
  const rawOrderFeatures = readOrderOptionalFeaturesFromSearchParams(params);
  const partial = { sourceDepositID, certNumber, hubSlotID, grade, serial };

  const bindings = validateSourceDepositListingBindings({
    sourceDepositID,
    hubSlotID,
    certNumber,
    grade,
    serial,
    guaranteeAmount,
    guaranteeCurrency,
    orderOptionalFeatures: rawOrderFeatures.length > 0 ? rawOrderFeatures : undefined,
  });

  if (!bindings.valid) {
    return {
      mode: true,
      prefill: null,
      orderFeaturesIssue: bindings.issue,
      partial,
    };
  }

  return {
    mode: true,
    prefill: {
      sourceDepositID,
      certNumber,
      hubSlotID,
      grade,
      serial,
      guaranteeAmount,
      guaranteeCurrency,
      ...(bindings.orderOptionalFeatures
        ? { orderOptionalFeatures: bindings.orderOptionalFeatures }
        : {}),
    },
    orderFeaturesIssue: null,
  };
}

export function parseSourceDepositListingSearchParams(
  params: Pick<URLSearchParams, 'get' | 'getAll'>
): SourceDepositListingPrefillInput | null {
  const state = resolveSourceDepositListingUrlState(params);
  if (!state.mode || !state.prefill) return null;
  return state.prefill;
}

export function isSourceDepositListingMode(
  params: Pick<URLSearchParams, 'get' | 'getAll'>
): boolean {
  return resolveSourceDepositListingUrlState(params).mode;
}

export function buildSourceDepositListingUrl(input: SourceDepositListingPrefillInput): string {
  const bindings = validateSourceDepositListingBindings(input);
  if (!bindings.valid) {
    throw new Error(`Invalid source-deposit order optional features (${bindings.issue}).`);
  }

  const query = new URLSearchParams();
  query.set('sourceDepositID', input.sourceDepositID);
  query.set('certNumber', input.certNumber);
  query.set('hubSlotID', input.hubSlotID);
  if (input.grade) query.set('grade', input.grade);
  if (input.serial) query.set('serial', input.serial);
  if (input.guaranteeAmount?.trim()) query.set('guaranteeAmount', input.guaranteeAmount.trim());
  if (input.guaranteeCurrency?.trim()) {
    query.set('guaranteeCurrency', input.guaranteeCurrency.trim());
  }
  if (bindings.orderOptionalFeatures?.length) {
    appendOrderOptionalFeaturesToSearchParams(query, bindings.orderOptionalFeatures);
  }
  return `/listing/new?${query.toString()}`;
}
