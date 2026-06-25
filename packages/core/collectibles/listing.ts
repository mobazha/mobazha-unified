import { COLLECTIBLE_FULFILLMENT_NFT } from './metadata';

export interface CollectibleListingSource {
  metadata?: { contractType?: string };
  item?: {
    blockchain?: string;
    tokenAddress?: string;
    tokenStandard?: string;
    tags?: string[];
  };
}

const COLLECTIBLE_TAG_PREFIX = 'collectibles:';

function parseCollectibleTag(tag: string): { key: string; value: string } | null {
  const trimmed = tag.trim();
  if (!trimmed.startsWith(COLLECTIBLE_TAG_PREFIX)) return null;
  const body = trimmed.slice(COLLECTIBLE_TAG_PREFIX.length);
  const eq = body.indexOf('=');
  if (eq <= 0) return null;
  return { key: body.slice(0, eq).trim(), value: body.slice(eq + 1).trim() };
}

export interface ParsedCollectibleListingMetadata {
  fulfillment: string;
  hubSlotID?: string;
  nftMint?: string;
  certNumber?: string;
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
    const parsed = parseCollectibleTag(tag);
    return (
      parsed?.key === 'fulfillment' || parsed?.key === 'hub_slot_id' || parsed?.key === 'nft_mint'
    );
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
  const fromTags: Record<string, string> = {};
  for (const tag of tags) {
    const parsed = parseCollectibleTag(tag);
    if (parsed?.key && parsed.value) fromTags[parsed.key] = parsed.value;
  }

  const nftMint = fromTags.nft_mint?.trim() || product.item?.tokenAddress?.trim() || undefined;

  return {
    fulfillment: fromTags.fulfillment?.trim() || COLLECTIBLE_FULFILLMENT_NFT,
    hubSlotID: fromTags.hub_slot_id?.trim() || undefined,
    nftMint,
    certNumber: fromTags.cert_number?.trim() || undefined,
  };
}
