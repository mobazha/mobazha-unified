// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { CHAINS, getChainFromCoin } from '../data/tokens';
import { COLLECTIBLE_FULFILLMENT_NFT } from './metadata';
import {
  readCollectibleSignedOrderOptionalFeatures,
  type CollectibleSignedListingOptionalFeature,
} from './orderOptionalFeatures';
import { parseCollectibleListingTag, parseCollectibleListingTagMap } from './listingTags';

export interface CollectibleListingSource {
  metadata?: { contractType?: string };
  item?: {
    blockchain?: string;
    tokenAddress?: string;
    tokenStandard?: string;
    tags?: string[];
    optionalFeatures?: Array<
      | string
      | CollectibleSignedListingOptionalFeature
      | { name?: string; surcharge?: string; description?: string; price?: number }
    >;
  };
}

export interface ParsedCollectibleListingMetadata {
  fulfillment: string;
  hubSlotID?: string;
  nftMint?: string;
  certNumber?: string;
  grade?: string;
  serial?: string;
  /** `source-custody` | `hub` | other hubLocation values from listing tags */
  hubLocation?: string;
  orderOptionalFeatures?: string[];
  orderOptionalFeaturesValid?: boolean;
}

/**
 * Hub+NFT primary-sale listing (Solana pNFT), distinct from legacy EVM RWA dashboard flow.
 */
export function isCollectibleHubNftListing(
  product: CollectibleListingSource | null | undefined
): boolean {
  if (!product || product.metadata?.contractType !== 'RWA_TOKEN') return false;

  const chain = (product.item?.blockchain || '').trim().toLowerCase();
  if (chain === 'solana' || chain === 'sol') return true;

  const standard = (product.item?.tokenStandard || '').trim().toLowerCase();
  if (standard.includes('pnft') || standard.includes('metaplex')) return true;

  const tags = product.item?.tags ?? [];
  return tags.some(tag => {
    const parsed = parseCollectibleListingTag(tag);
    const key = parsed?.key.replace(/@\d+\/\d+$/, '') ?? '';
    return key === 'fulfillment' || key === 'hub_slot_id' || key === 'nft_mint';
  });
}

/** Legacy Broadway / EVM atomic-swap RWA listings — still blocked in checkout until migrated. */
export function isLegacyEvmRwaListing(
  product: CollectibleListingSource | null | undefined
): boolean {
  if (!product || product.metadata?.contractType !== 'RWA_TOKEN') return false;
  return !isCollectibleHubNftListing(product);
}

export function parseCollectibleListingMetadata(
  product: CollectibleListingSource
): ParsedCollectibleListingMetadata {
  const tags = product.item?.tags ?? [];
  const fromTags = parseCollectibleListingTagMap(tags);

  const nftMint = fromTags.nft_mint?.trim() || product.item?.tokenAddress?.trim() || undefined;
  const hubSlotID = fromTags.hub_slot_id?.trim() || undefined;
  const certNumber = fromTags.cert_number?.trim() || undefined;
  const signedFeatures = readCollectibleSignedOrderOptionalFeatures(
    product.item?.optionalFeatures,
    { hubSlotID, certNumber }
  );

  return {
    fulfillment: fromTags.fulfillment?.trim() || COLLECTIBLE_FULFILLMENT_NFT,
    hubSlotID,
    nftMint,
    certNumber,
    grade: fromTags.grade?.trim() || undefined,
    serial: fromTags.serial?.trim() || undefined,
    hubLocation: fromTags.hub_location?.trim() || undefined,
    orderOptionalFeatures: signedFeatures.valid ? signedFeatures.features : undefined,
    orderOptionalFeaturesValid: signedFeatures.valid,
  };
}

export type CollectibleListingCustodyKind = 'source' | 'hub' | 'unknown';

/** Human-readable title network from listing blockchain (e.g. solana → Solana). */
export function resolveCollectibleTitleNetworkLabel(
  blockchain?: string | null
): string | undefined {
  const normalized = (blockchain ?? '').trim().toLowerCase();
  if (!normalized) return undefined;

  if (normalized === 'solana' || normalized === 'sol') return 'Solana';

  const chainId = getChainFromCoin(blockchain!.trim());
  if (!chainId) return undefined;

  const config = CHAINS.find(chain => chain.id.toUpperCase() === chainId);
  return config?.name ?? chainId;
}

/** Derive custody display from listing tags — does not infer Hub custody for source-held cards. */
export function resolveCollectibleListingCustodyKind(
  meta: Pick<ParsedCollectibleListingMetadata, 'hubLocation'>
): CollectibleListingCustodyKind {
  const location = (meta.hubLocation || '').trim().toLowerCase();
  if (location === 'source-custody' || location === 'source') {
    return 'source';
  }
  if (location === 'hub' || location.startsWith('hub-')) {
    return 'hub';
  }
  return 'unknown';
}

function isAuthoritativeCollectibleHubLocation(location: string | undefined): boolean {
  const normalized = (location ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === 'source-custody' ||
    normalized === 'source' ||
    normalized === 'hub' ||
    normalized.startsWith('hub-')
  );
}

/**
 * Strict gate for digital-title / source-custody UX.
 * Ordinary PHYSICAL_GOOD listings and RWA listings without explicit collectible tags
 * must keep standard shipping/purchase flows.
 */
export function hasAuthoritativeCollectibleTitleMetadata(
  product: CollectibleListingSource | null | undefined
): boolean {
  if (!isCollectibleHubNftListing(product)) return false;

  const meta = parseCollectibleListingMetadata(product!);
  if (meta.orderOptionalFeaturesValid === false) return false;
  if (meta.fulfillment !== COLLECTIBLE_FULFILLMENT_NFT) return false;
  if (!meta.certNumber?.trim()) return false;
  if (!meta.hubSlotID?.trim()) return false;
  if (!isAuthoritativeCollectibleHubLocation(meta.hubLocation)) return false;

  return true;
}
