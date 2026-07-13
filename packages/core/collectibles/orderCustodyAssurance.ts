// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { Order, OrderState } from '../types/order';
import {
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS,
  COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX,
  parseCollectibleOrderOptionalFeature,
} from './orderOptionalFeatures';
import {
  resolveCollectibleListingCustodyKind,
  type CollectibleListingCustodyKind,
} from './listing';
import { isCollectiblePrimarySaleOrder, parseCollectibleOrderMetadata } from './order';

export type CollectibleOrderCustodyAssurancePhase =
  | 'invalid_binding'
  | 'cancelled_unpaid'
  | 'cancelled_paid'
  | 'pending_payment'
  | 'custody_active';

export type CollectibleOrderCustodyBindingIssue =
  | 'invalidFeatureFormat'
  | 'duplicateKey'
  | 'disallowedKey'
  | 'conflictingCustodyBinding'
  | 'hubSlotMismatch'
  | 'certNumberMismatch'
  | 'nftMintMismatch';

export interface CollectibleOrderCustodyBindingValues {
  sourceDepositId?: string;
  fulfillment?: string;
  hubSlotId?: string;
  certNumber?: string;
  hubLocation?: string;
  grade?: string;
  serial?: string;
  nftMint?: string;
  holderWallet?: string;
}

export interface CollectibleOrderCustodyAssuranceView {
  visible: boolean;
  phase: CollectibleOrderCustodyAssurancePhase;
  issue?: CollectibleOrderCustodyBindingIssue;
  certNumber?: string;
  hubSlotId?: string;
  nftMint?: string;
  /** Present only when hub_location proves source or Hub custody. */
  custodyKind?: CollectibleListingCustodyKind;
}

const TERMINAL_INACTIVE_ORDER_STATES = new Set<OrderState>(['CANCELED', 'DECLINED', 'REFUNDED']);

const PAYMENT_VERIFIED_ORDER_STATES = new Set<OrderState>([
  'AWAITING_SHIPMENT',
  'PARTIALLY_SHIPPED',
  'SHIPPED',
  'COMPLETED',
  'DISPUTED',
  'DECIDED',
  'RESOLVED',
  'PAYMENT_FINALIZED',
]);

const CUSTODY_BINDING_KEYS = new Set<string>([
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.sourceDepositId,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.fulfillment,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubLocation,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.grade,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.serial,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.nftMint,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet,
]);

const IGNORED_COLLATERAL_KEYS = new Set<string>([
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyId,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyVersion,
]);

type OptionalFeatureInput = string | { name?: string };

function readOptionalFeatureStrings(
  features: readonly OptionalFeatureInput[] | null | undefined
): string[] {
  if (!features?.length) return [];

  const names: string[] = [];
  for (const entry of features) {
    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      if (trimmed) names.push(trimmed);
      continue;
    }

    const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
    if (name) names.push(name);
  }

  return names;
}

function orderHasCollectibleSignedFeatures(order: Order | null | undefined): boolean {
  const items = order?.contract?.orderOpen?.items;
  if (!items?.length) return false;

  for (const item of items) {
    for (const feature of readOptionalFeatureStrings(item.optionalFeatures)) {
      if (feature.startsWith(COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX)) {
        return true;
      }
    }
  }

  return false;
}

function mapBindingValues(values: Map<string, string>): CollectibleOrderCustodyBindingValues {
  const read = (key: string) => values.get(key)?.trim() || undefined;
  return {
    sourceDepositId: read(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.sourceDepositId),
    fulfillment: read(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.fulfillment),
    hubSlotId: read(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId),
    certNumber: read(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber),
    hubLocation: read(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubLocation),
    grade: read(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.grade),
    serial: read(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.serial),
    nftMint: read(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.nftMint),
    holderWallet: read(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet),
  };
}

function crossCheckCustodyBindingsAgainstMetadata(
  bindings: Map<string, string>,
  fiatMetadata?: Record<string, string> | null
): CollectibleOrderCustodyBindingIssue | null {
  const orderMeta = parseCollectibleOrderMetadata(fiatMetadata);
  if (!orderMeta) return null;

  const signedHubSlot = bindings.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId)?.trim();
  if (orderMeta.hubSlotID && signedHubSlot && signedHubSlot !== orderMeta.hubSlotID) {
    return 'hubSlotMismatch';
  }

  const signedCert = bindings.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber)?.trim();
  if (orderMeta.certNumber && signedCert && signedCert !== orderMeta.certNumber) {
    return 'certNumberMismatch';
  }

  const signedMint = bindings.get(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.nftMint)?.trim();
  if (orderMeta.nftMint && signedMint && signedMint !== orderMeta.nftMint) {
    return 'nftMintMismatch';
  }

  return null;
}

/**
 * Validate signed custody bindings on order items.
 * Collateral keys are ignored; malformed or conflicting custody entries fail closed.
 */
export function validateSignedOrderCustodyBindings(
  order: Order,
  fiatMetadata?: Record<string, string> | null
):
  | { valid: true; bindings: CollectibleOrderCustodyBindingValues }
  | { valid: false; issue: CollectibleOrderCustodyBindingIssue } {
  const items = order.contract?.orderOpen?.items ?? [];
  const mergedBindings = new Map<string, string>();
  let sawCollectiblePrefixedFeature = false;

  for (const item of items) {
    const itemBindings = new Map<string, string>();

    for (const feature of readOptionalFeatureStrings(item.optionalFeatures)) {
      const trimmed = feature.trim();
      if (!trimmed.startsWith(COLLECTIBLES_ORDER_OPTIONAL_FEATURE_PREFIX)) {
        continue;
      }

      sawCollectiblePrefixedFeature = true;
      const parsed = parseCollectibleOrderOptionalFeature(trimmed);
      if (!parsed) {
        return { valid: false, issue: 'invalidFeatureFormat' };
      }

      if (IGNORED_COLLATERAL_KEYS.has(parsed.key)) {
        continue;
      }

      if (!CUSTODY_BINDING_KEYS.has(parsed.key)) {
        return { valid: false, issue: 'disallowedKey' };
      }

      if (itemBindings.has(parsed.key)) {
        if (itemBindings.get(parsed.key) !== parsed.value) {
          return { valid: false, issue: 'conflictingCustodyBinding' };
        }
        continue;
      }
      itemBindings.set(parsed.key, parsed.value);

      const existing = mergedBindings.get(parsed.key);
      if (existing !== undefined && existing !== parsed.value) {
        return { valid: false, issue: 'conflictingCustodyBinding' };
      }
      mergedBindings.set(parsed.key, parsed.value);
    }
  }

  if (!sawCollectiblePrefixedFeature) {
    return { valid: true, bindings: {} };
  }

  const metadataIssue = crossCheckCustodyBindingsAgainstMetadata(
    mergedBindings,
    fiatMetadata ?? order.paymentState?.fiatMetadata
  );
  if (metadataIssue) {
    return { valid: false, issue: metadataIssue };
  }

  return { valid: true, bindings: mapBindingValues(mergedBindings) };
}

/** Whether buyer order detail should show custody assurance (not collateral). */
export function hasCollectibleBuyerOrderContext(order: Order | null | undefined): boolean {
  const fiatMetadata = order?.paymentState?.fiatMetadata;
  if (isCollectiblePrimarySaleOrder(fiatMetadata)) {
    return true;
  }
  return orderHasCollectibleSignedFeatures(order);
}

/** Mirrors primary-sale card payment detection for custody copy. */
export function isCollectibleOrderPaymentVerified(order: Order | null | undefined): boolean {
  if (!order) return false;
  if (order.funded === true) return true;
  if (order.paymentState?.verificationStatus === 'verified') return true;
  return PAYMENT_VERIFIED_ORDER_STATES.has(order.state);
}

function resolveCustodyAssurancePhase(
  order: Order
): Exclude<CollectibleOrderCustodyAssurancePhase, 'invalid_binding'> {
  const paymentVerified = isCollectibleOrderPaymentVerified(order);

  if (TERMINAL_INACTIVE_ORDER_STATES.has(order.state)) {
    return paymentVerified ? 'cancelled_paid' : 'cancelled_unpaid';
  }

  if (!paymentVerified) {
    return 'pending_payment';
  }

  return 'custody_active';
}

function resolveCustodyKind(
  bindings: CollectibleOrderCustodyBindingValues
): CollectibleListingCustodyKind | undefined {
  if (!bindings.hubLocation?.trim()) {
    return undefined;
  }

  const kind = resolveCollectibleListingCustodyKind({ hubLocation: bindings.hubLocation });
  return kind === 'unknown' ? undefined : kind;
}

function resolveDisplayFields(
  orderMeta: ReturnType<typeof parseCollectibleOrderMetadata>,
  bindings: CollectibleOrderCustodyBindingValues
): Pick<CollectibleOrderCustodyAssuranceView, 'certNumber' | 'hubSlotId' | 'nftMint'> {
  return {
    certNumber: orderMeta?.certNumber || bindings.certNumber,
    hubSlotId: orderMeta?.hubSlotID || bindings.hubSlotId,
    nftMint: orderMeta?.nftMint || bindings.nftMint,
  };
}

/** Buyer-facing custody assurance derived from order state — no collateral terminology. */
export function resolveCollectibleOrderCustodyAssurance(
  order: Order | null | undefined
): CollectibleOrderCustodyAssuranceView {
  if (!order || !hasCollectibleBuyerOrderContext(order)) {
    return {
      visible: false,
      phase: 'custody_active',
    };
  }

  let bindings: CollectibleOrderCustodyBindingValues = {};
  if (orderHasCollectibleSignedFeatures(order)) {
    const validation = validateSignedOrderCustodyBindings(order);
    if (!validation.valid) {
      return {
        visible: true,
        phase: 'invalid_binding',
        issue: validation.issue,
      };
    }
    bindings = validation.bindings;
  }

  const orderMeta = parseCollectibleOrderMetadata(order.paymentState?.fiatMetadata);
  const phase = resolveCustodyAssurancePhase(order);
  const custodyKind = phase === 'custody_active' ? resolveCustodyKind(bindings) : undefined;

  return {
    visible: true,
    phase,
    custodyKind,
    ...resolveDisplayFields(orderMeta, bindings),
  };
}
