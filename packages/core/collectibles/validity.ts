import type { CollectibleNFT, CollectibleNFTValidityStatus } from './types';

/** Known backend values — unknown strings pass through for forward compatibility. */
export const KNOWN_COLLECTIBLE_NFT_VALIDITY_STATUSES = ['active', 'burned', 'voided'] as const;

export type KnownCollectibleNFTValidityStatus =
  (typeof KNOWN_COLLECTIBLE_NFT_VALIDITY_STATUSES)[number];

export type CollectibleValidityDisplayKey =
  | 'collectibles.validity.active'
  | 'collectibles.validity.burned'
  | 'collectibles.validity.voided'
  | 'collectibles.validity.unknown';

export function normalizeCollectibleNFTValidityStatus(
  value: unknown
): CollectibleNFTValidityStatus | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function isKnownCollectibleNFTValidityStatus(
  value: string | undefined
): value is KnownCollectibleNFTValidityStatus {
  if (!value) return false;
  return (KNOWN_COLLECTIBLE_NFT_VALIDITY_STATUSES as readonly string[]).includes(value);
}

export function resolveCollectibleNFTValidityStatus(
  nft: Pick<CollectibleNFT, 'validityStatus' | 'burnAt'>
): CollectibleNFTValidityStatus {
  const explicit = normalizeCollectibleNFTValidityStatus(nft.validityStatus);
  if (explicit) return explicit;
  if (nft.burnAt?.trim()) return 'burned';
  return 'active';
}

export function isCollectibleNFTVoided(
  nft: Pick<CollectibleNFT, 'validityStatus' | 'burnAt'>
): boolean {
  return resolveCollectibleNFTValidityStatus(nft) === 'voided';
}

export function isCollectibleNFTBurned(
  nft: Pick<CollectibleNFT, 'validityStatus' | 'burnAt'>
): boolean {
  const status = resolveCollectibleNFTValidityStatus(nft);
  return status === 'burned' || Boolean(nft.burnAt?.trim());
}

export function isCollectibleNFTCredentialActive(
  nft: Pick<CollectibleNFT, 'validityStatus' | 'burnAt'>
): boolean {
  return resolveCollectibleNFTValidityStatus(nft) === 'active' && !nft.burnAt?.trim();
}

/** Redemption and ownership actions require an active, non-voided credential. */
export function isCollectibleNFTCredentialActionBlocked(
  nft: Pick<CollectibleNFT, 'validityStatus' | 'burnAt'>
): boolean {
  return !isCollectibleNFTCredentialActive(nft);
}

export function resolveCollectibleValidityDisplayKey(
  status: CollectibleNFTValidityStatus | undefined
): CollectibleValidityDisplayKey {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'active') return 'collectibles.validity.active';
  if (normalized === 'burned') return 'collectibles.validity.burned';
  if (normalized === 'voided') return 'collectibles.validity.voided';
  return 'collectibles.validity.unknown';
}
