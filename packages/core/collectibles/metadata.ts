// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Collectible order metadata keys — aligned with mobazha/pkg/models/collectibles_metadata.go
 */

export const COLLECTIBLE_FULFILLMENT_NFT = 'nft' as const;

export const COLLECTIBLE_FEATURE_PREFIX = 'collectibles.';

export const COLLECTIBLE_FEATURE_KEYS = {
  fulfillment: 'fulfillment',
  hubSlotId: 'hub_slot_id',
  nftMint: 'nft_mint',
  certNumber: 'cert_number',
  holderWallet: 'holder_wallet',
} as const;

export type CollectibleFeatureKey =
  (typeof COLLECTIBLE_FEATURE_KEYS)[keyof typeof COLLECTIBLE_FEATURE_KEYS];

export interface CollectiblePurchaseFields {
  fulfillment?: string;
  hubSlotID?: string;
  nftMint?: string;
  certNumber?: string;
  /** Buyer Solana wallet — mint destination on authoritative first sale. */
  holderWallet?: string;
  optionalFeatures?: string[];
}

/** Canonical OptionalFeatures entry: `collectibles.<key>=<value>` */
export function collectibleOptionalFeature(key: CollectibleFeatureKey, value: string): string {
  const trimmedKey = key.trim();
  const trimmedValue = value.trim();
  if (!trimmedKey || !trimmedValue) return '';
  return `${COLLECTIBLE_FEATURE_PREFIX}${trimmedKey}=${trimmedValue}`;
}

function hasCollectibleFeature(features: string[], key: CollectibleFeatureKey): boolean {
  const prefix = `${COLLECTIBLE_FEATURE_PREFIX}${key}=`;
  return features.some(feature => feature.trim().startsWith(prefix));
}

/** Merge explicit JSON fields into optionalFeatures without duplicating keys. */
export function purchaseItemOptionalFeaturesWithCollectibleMetadata(
  fields: CollectiblePurchaseFields
): string[] {
  const features = [...(fields.optionalFeatures ?? [])];
  const append = (key: CollectibleFeatureKey, value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed || hasCollectibleFeature(features, key)) return;
    const entry = collectibleOptionalFeature(key, trimmed);
    if (entry) features.push(entry);
  };

  append(COLLECTIBLE_FEATURE_KEYS.fulfillment, fields.fulfillment);
  append(COLLECTIBLE_FEATURE_KEYS.hubSlotId, fields.hubSlotID);
  append(COLLECTIBLE_FEATURE_KEYS.nftMint, fields.nftMint);
  append(COLLECTIBLE_FEATURE_KEYS.certNumber, fields.certNumber);
  append(COLLECTIBLE_FEATURE_KEYS.holderWallet, fields.holderWallet);

  return features;
}

/** Build Node PurchaseItem collectible fields for order creation. */
export function buildCollectiblePurchaseItemPayload(fields: CollectiblePurchaseFields) {
  const optionalFeatures = purchaseItemOptionalFeaturesWithCollectibleMetadata(fields);
  return {
    ...(fields.fulfillment?.trim() ? { fulfillment: fields.fulfillment.trim() } : {}),
    ...(fields.hubSlotID?.trim() ? { hubSlotID: fields.hubSlotID.trim() } : {}),
    ...(fields.nftMint?.trim() ? { nftMint: fields.nftMint.trim() } : {}),
    ...(fields.certNumber?.trim() ? { certNumber: fields.certNumber.trim() } : {}),
    ...(fields.holderWallet?.trim() ? { holderWallet: fields.holderWallet.trim() } : {}),
    ...(optionalFeatures.length > 0 ? { optionalFeatures } : {}),
  };
}
