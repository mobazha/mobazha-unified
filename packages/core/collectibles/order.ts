// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Order-side collectible metadata — mirrors mobazha/pkg/models/collectibles_metadata.go
 */

import { COLLECTIBLE_FULFILLMENT_NFT } from './metadata';

export const COLLECTIBLE_METADATA_KEYS = {
  type: 'collectible_type',
  fulfillment: 'collectible_fulfillment',
  hubSlotId: 'collectible_hub_slot_id',
  nftMint: 'collectible_nft_mint',
  certNumber: 'collectible_cert_number',
  listingHash: 'collectible_listing_hash',
  listingSlug: 'collectible_listing_slug',
  buyerPeerId: 'collectible_buyer_peer_id',
  sellerPeerId: 'collectible_seller_peer_id',
  contractType: 'collectible_contract_type',
  tokenStandard: 'collectible_token_standard',
  tokenAddress: 'collectible_token_address',
} as const;

export const COLLECTIBLE_METADATA_TYPE_PRIMARY_SALE = 'collectible_primary_sale';

export interface CollectibleOrderMetadata {
  type: string;
  fulfillment: string;
  hubSlotID: string;
  nftMint: string;
  certNumber: string;
  listingHash?: string;
  listingSlug?: string;
  buyerPeerID?: string;
  sellerPeerID?: string;
  contractType?: string;
  tokenStandard?: string;
  tokenAddress?: string;
}

export function parseCollectibleOrderMetadata(
  fiatMetadata?: Record<string, string> | null
): CollectibleOrderMetadata | null {
  if (!fiatMetadata || Object.keys(fiatMetadata).length === 0) {
    return null;
  }
  const meta: CollectibleOrderMetadata = {
    type: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.type] || '').trim(),
    fulfillment: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.fulfillment] || '').trim(),
    hubSlotID: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.hubSlotId] || '').trim(),
    nftMint: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.nftMint] || '').trim(),
    certNumber: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.certNumber] || '').trim(),
    listingHash: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.listingHash] || '').trim() || undefined,
    listingSlug: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.listingSlug] || '').trim() || undefined,
    buyerPeerID: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.buyerPeerId] || '').trim() || undefined,
    sellerPeerID: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.sellerPeerId] || '').trim() || undefined,
    contractType: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.contractType] || '').trim() || undefined,
    tokenStandard:
      (fiatMetadata[COLLECTIBLE_METADATA_KEYS.tokenStandard] || '').trim() || undefined,
    tokenAddress: (fiatMetadata[COLLECTIBLE_METADATA_KEYS.tokenAddress] || '').trim() || undefined,
  };

  const isCollectible =
    meta.type === COLLECTIBLE_METADATA_TYPE_PRIMARY_SALE ||
    meta.fulfillment.toLowerCase() === COLLECTIBLE_FULFILLMENT_NFT ||
    meta.hubSlotID !== '' ||
    meta.nftMint !== '';

  if (!isCollectible) {
    return null;
  }

  if (!meta.type) {
    meta.type = COLLECTIBLE_METADATA_TYPE_PRIMARY_SALE;
  }
  if (!meta.fulfillment) {
    meta.fulfillment = COLLECTIBLE_FULFILLMENT_NFT;
  }
  return meta;
}

/** Hub+NFT primary-sale orders carry nft fulfillment and/or hub slot metadata. */
export function isCollectiblePrimarySaleOrder(
  fiatMetadata?: Record<string, string> | null
): boolean {
  const meta = parseCollectibleOrderMetadata(fiatMetadata);
  if (!meta) return false;
  return (
    meta.fulfillment.toLowerCase() === COLLECTIBLE_FULFILLMENT_NFT ||
    meta.hubSlotID !== '' ||
    meta.nftMint !== ''
  );
}
