// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { ApiError } from '../services/api/client';
import { getCollectibleDemoCardImageUrl } from '../curation/collectibleMarketplace';
import type { CollectibleHubSlot, CollectibleNFT } from './types';
import {
  isCollectibleNFTCredentialActionBlocked,
  resolveCollectibleNFTValidityStatus,
  resolveCollectibleValidityDisplayKey,
  type CollectibleValidityDisplayKey,
} from './validity';

/** True when the public catalog list endpoint is absent or feature-guarded off. */
export function isCollectiblesPublicCatalogUnavailableError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.status === 404 || error.status === 403) {
    return true;
  }

  const code = error.code?.toLowerCase();
  return code === 'not_found' || code === 'forbidden' || code === 'feature_disabled';
}

/** Private redemption lookup — only after login when the NFT is already burned. */
export function shouldQueryCollectibleRedemptionByMint(
  isAuthenticated: boolean,
  nft: Pick<CollectibleNFT, 'burnAt' | 'nftMint'> | null | undefined
): boolean {
  return isAuthenticated && !!nft?.burnAt && !!nft.nftMint?.trim();
}

export function normalizeCollectibleCatalogLookupKey(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase();
}

/** Demo/test catalog display — keyed by cert, serial, hub slot, or mint; does not mutate API data. */
export interface CollectibleCatalogDemoEntry {
  certNumbers?: readonly string[];
  serials?: readonly string[];
  hubSlotIDs?: readonly string[];
  nftMints?: readonly string[];
  listingSlug: string;
  nameKey: 'collectibles.catalog.display.m2Wilson001.name';
  grade?: string;
}

export const COLLECTIBLE_CATALOG_DEMO_ENTRIES: readonly CollectibleCatalogDemoEntry[] = [
  {
    certNumbers: ['M2-WILSON-001'],
    serials: ['WILSON-001'],
    hubSlotIDs: ['source_9591a58c-4f55-4e57-a151-9b4a0558a238'],
    nftMints: ['mockpnft63e66626bd4e442e77e0e953d61226dc5512'],
    listingSlug: 'm2-wilson-sports-card-demo-001-psa-10-testnet',
    nameKey: 'collectibles.catalog.display.m2Wilson001.name',
    grade: 'PSA 10',
  },
] as const;

function matchesCollectibleCatalogDemoCert(
  entry: CollectibleCatalogDemoEntry,
  certKey: string,
  serialKey: string
): boolean {
  if (
    !certKey ||
    !entry.certNumbers?.some(c => normalizeCollectibleCatalogLookupKey(c) === certKey)
  ) {
    return false;
  }

  if (!entry.serials?.length) {
    return true;
  }

  if (!serialKey) {
    return true;
  }

  return entry.serials.some(s => normalizeCollectibleCatalogLookupKey(s) === serialKey);
}

function findCollectibleCatalogDemoEntry(input: {
  hubSlotID?: string;
  nftMint?: string;
  certNumber?: string;
  serial?: string;
}): CollectibleCatalogDemoEntry | undefined {
  const certKey = normalizeCollectibleCatalogLookupKey(input.certNumber);
  const serialKey = normalizeCollectibleCatalogLookupKey(input.serial);
  const slotKey = normalizeCollectibleCatalogLookupKey(input.hubSlotID);
  const mintKey = normalizeCollectibleCatalogLookupKey(input.nftMint);

  return COLLECTIBLE_CATALOG_DEMO_ENTRIES.find(entry => {
    if (matchesCollectibleCatalogDemoCert(entry, certKey, serialKey)) {
      return true;
    }
    if (
      mintKey &&
      entry.nftMints?.some(id => normalizeCollectibleCatalogLookupKey(id) === mintKey)
    ) {
      return true;
    }
    if (
      slotKey &&
      entry.hubSlotIDs?.some(id => normalizeCollectibleCatalogLookupKey(id) === slotKey)
    ) {
      return true;
    }
    return false;
  });
}

export type CollectibleCatalogCustodyStatusKey =
  | 'collectibles.catalog.custody.redeemed'
  | 'collectibles.catalog.custody.redeemRequested'
  | 'collectibles.catalog.custody.inHub'
  | 'collectibles.catalog.custody.sourceCustody'
  | 'collectibles.catalog.custody.pending'
  | 'collectibles.catalog.custody.unknown';

export interface CollectibleCatalogDisplay {
  displayName: string;
  grade: string;
  imageUrl?: string;
  /** Shortened certification id when the raw value is hidden from the product title. */
  certificationReference?: string;
  /** Shortened serial when the raw value is hidden from the product title. */
  serialReference?: string;
  custodyStatusKey: CollectibleCatalogCustodyStatusKey;
  validityStatusKey: CollectibleValidityDisplayKey;
  validityStatus: string;
  redeemable: boolean;
  credentialActionsBlocked: boolean;
  hasDemoMapping: boolean;
  /** True only when item data includes an issued digital title (mint). */
  hasDigitalTitle: boolean;
}

const SYNTHETIC_CATALOG_IDENTIFIER =
  /^(?:e2e[-_]?seed|e2e[-_]|ser[-_](?:seed|collateral)|source[-_]|default[-_]|fixture[-_]|mock[-_])/i;

/** True for E2E/seed/collateral fixture ids and other non-marketing catalog identifiers. */
export function isCollectibleSyntheticCatalogIdentifier(value: string | undefined | null): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return SYNTHETIC_CATALOG_IDENTIFIER.test(trimmed);
}

export function shortenCollectibleProofReference(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 20) return trimmed;
  return `${trimmed.slice(0, 12)}…${trimmed.slice(-4)}`;
}

function resolveCustodyStatusKey(
  burnAt: string | undefined,
  slot?: CollectibleHubSlot
): CollectibleCatalogCustodyStatusKey {
  if (burnAt?.trim()) {
    return 'collectibles.catalog.custody.redeemed';
  }

  const status = normalizeCollectibleCatalogLookupKey(slot?.status);
  if (status === 'redeem_requested' || status === 'shipped') {
    return 'collectibles.catalog.custody.redeemRequested';
  }
  if (status === 'in_circulation' || status === 'minted' || status === 'settled') {
    const hubLocation = normalizeCollectibleCatalogLookupKey(slot?.hubLocation);
    if (hubLocation === 'source-custody') {
      return 'collectibles.catalog.custody.sourceCustody';
    }
    return 'collectibles.catalog.custody.inHub';
  }
  if (
    status === 'received' ||
    status === 'minting' ||
    status === 'submitted' ||
    status === 'source_held'
  ) {
    return 'collectibles.catalog.custody.pending';
  }

  return 'collectibles.catalog.custody.unknown';
}

export function isCollectibleCatalogRedeemable(
  nft: Pick<CollectibleNFT, 'validityStatus' | 'burnAt' | 'hubSlot'>
): boolean {
  if (isCollectibleNFTCredentialActionBlocked(nft)) return false;
  const slot = nft.hubSlot;
  const status = normalizeCollectibleCatalogLookupKey(slot?.status);
  return status === 'in_circulation' || status === 'minted';
}

function fallbackDisplayName(
  slot: CollectibleHubSlot | undefined,
  hubSlotID: string | undefined,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const cert = slot?.certNumber?.trim();
  if (cert && !isCollectibleSyntheticCatalogIdentifier(cert)) return cert;

  const serial = slot?.serial?.trim();
  if (serial && !isCollectibleSyntheticCatalogIdentifier(serial)) {
    return t('collectibles.catalog.display.serialCard', { serial });
  }

  const grade = slot?.grade?.trim();
  if (grade) {
    return t('collectibles.catalog.display.gradedCollectible', { grade });
  }

  const slotId = hubSlotID?.trim();
  if (slotId) {
    const tail = slotId.split(/[-_]+/).filter(Boolean).pop();
    if (tail && tail.length >= 4 && tail.length <= 12 && /^[a-z0-9]+$/i.test(tail)) {
      return t('collectibles.catalog.display.referenceCard', { reference: tail.toUpperCase() });
    }
  }

  return t('collectibles.catalog.unnamedCard');
}

function resolveHasDigitalTitle(nft: Pick<CollectibleNFT, 'nftMint' | 'validityStatus'>): boolean {
  const mint = nft.nftMint?.trim();
  if (!mint) return false;
  const validityStatus = resolveCollectibleNFTValidityStatus(nft);
  return validityStatus !== 'voided';
}

function isSafeCollectibleCatalogImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//') && !trimmed.includes('\\');
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** First safe custody evidence photo from hubSlot.photosJSON when no curated demo image exists. */
function resolveFirstSafeCustodyEvidencePhotoUrl(
  photosJSON: string | undefined | null
): string | undefined {
  if (!photosJSON?.trim()) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(photosJSON);
  } catch {
    return undefined;
  }

  if (!Array.isArray(parsed)) return undefined;

  for (const entry of parsed) {
    if (typeof entry !== 'string') continue;
    const url = entry.trim();
    if (isSafeCollectibleCatalogImageUrl(url)) return url;
  }

  return undefined;
}

/** User-facing catalog card fields with demo mapping and API fallbacks. */
export function resolveCollectibleCatalogDisplay(
  nft: Pick<CollectibleNFT, 'nftMint' | 'hubSlotID' | 'hubSlot' | 'burnAt' | 'validityStatus'>,
  t: (key: string, params?: Record<string, string | number>) => string
): CollectibleCatalogDisplay {
  const demo = findCollectibleCatalogDemoEntry({
    hubSlotID: nft.hubSlotID,
    nftMint: nft.nftMint,
    certNumber: nft.hubSlot?.certNumber,
    serial: nft.hubSlot?.serial,
  });

  const displayName = demo ? t(demo.nameKey) : fallbackDisplayName(nft.hubSlot, nft.hubSlotID, t);

  const grade = nft.hubSlot?.grade?.trim() || demo?.grade?.trim() || '';
  const rawCert = nft.hubSlot?.certNumber?.trim();
  const rawSerial = nft.hubSlot?.serial?.trim();
  const certificationReference =
    rawCert && (isCollectibleSyntheticCatalogIdentifier(rawCert) || rawCert !== displayName)
      ? shortenCollectibleProofReference(rawCert)
      : undefined;
  const serialReference =
    rawSerial && isCollectibleSyntheticCatalogIdentifier(rawSerial) && rawSerial !== displayName
      ? shortenCollectibleProofReference(rawSerial)
      : undefined;

  const imageUrl = demo
    ? getCollectibleDemoCardImageUrl(demo.listingSlug)
    : resolveFirstSafeCustodyEvidencePhotoUrl(nft.hubSlot?.photosJSON);
  const validityStatus = resolveCollectibleNFTValidityStatus(nft);
  const validityStatusKey = resolveCollectibleValidityDisplayKey(validityStatus);

  return {
    displayName,
    grade,
    imageUrl,
    certificationReference,
    serialReference,
    custodyStatusKey: resolveCustodyStatusKey(nft.burnAt, nft.hubSlot),
    validityStatusKey,
    validityStatus,
    redeemable: isCollectibleCatalogRedeemable(nft),
    credentialActionsBlocked: isCollectibleNFTCredentialActionBlocked(nft),
    hasDemoMapping: Boolean(demo),
    hasDigitalTitle: resolveHasDigitalTitle(nft),
  };
}
