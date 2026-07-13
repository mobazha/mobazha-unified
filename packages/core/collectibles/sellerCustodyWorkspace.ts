// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { isCollectibleSyntheticCatalogIdentifier } from './catalog';
import type { CollectibleSourceDeposit } from './types';

/** Default preview size for seller workspace active/history lists before explicit expansion. */
export const SELLER_CUSTODY_WORKSPACE_PREVIEW_LIMIT = 5;

export type SellerCustodyCountKey =
  | 'needsAction'
  | 'inReview'
  | 'readyToList'
  | 'redemptionOrCompleted';

export type SellerCustodyWorkspaceCounts = Record<SellerCustodyCountKey, number>;

export interface SellerCustodyWorkspaceGroups {
  counts: SellerCustodyWorkspaceCounts;
  nextAction: CollectibleSourceDeposit | null;
  active: CollectibleSourceDeposit[];
  history: CollectibleSourceDeposit[];
}

function normalizeStatus(status: string | undefined): string {
  return (status ?? '').trim().toLowerCase();
}

const HISTORY_STATUSES = new Set(['rejected', 'defaulted', 'settled']);

/** Closed or terminal records belong in History — never surfaced as the primary next action. */
export function isSellerCustodyHistoryDeposit(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): boolean {
  return HISTORY_STATUSES.has(normalizeStatus(deposit.status));
}

export function resolveSellerCustodyCountBucket(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): SellerCustodyCountKey | null {
  if (isSellerCustodyHistoryDeposit(deposit)) return null;

  switch (normalizeStatus(deposit.status)) {
    case 'redeem_requested':
      return 'needsAction';
    case 'source_held':
      return 'readyToList';
    case 'submitted':
    case 'minting':
      return 'inReview';
    case 'minted':
    case 'in_circulation':
    case 'shipped':
      return 'redemptionOrCompleted';
    default:
      return 'inReview';
  }
}

/**
 * Lower value = higher urgency for seller next-action selection.
 * Redemption shipment outranks create-listing, review-waiting, and closed states.
 */
export function resolveSellerCustodyPriority(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): number {
  if (isSellerCustodyHistoryDeposit(deposit)) return 1_000;

  switch (normalizeStatus(deposit.status)) {
    case 'redeem_requested':
      return 0;
    case 'source_held':
      return 10;
    case 'shipped':
      return 20;
    case 'submitted':
      return 30;
    case 'minting':
      return 40;
    case 'minted':
      return 50;
    case 'in_circulation':
      return 60;
    default:
      return 80;
  }
}

export function compareSellerCustodyPriority(
  a: Pick<CollectibleSourceDeposit, 'status' | 'createdAt' | 'updatedAt'>,
  b: Pick<CollectibleSourceDeposit, 'status' | 'createdAt' | 'updatedAt'>
): number {
  const priorityDelta = resolveSellerCustodyPriority(a) - resolveSellerCustodyPriority(b);
  if (priorityDelta !== 0) return priorityDelta;

  const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
  return bTime - aTime;
}

export function resolveSellerCustodyCounts(
  deposits: readonly CollectibleSourceDeposit[]
): SellerCustodyWorkspaceCounts {
  const counts: SellerCustodyWorkspaceCounts = {
    needsAction: 0,
    inReview: 0,
    readyToList: 0,
    redemptionOrCompleted: 0,
  };

  for (const deposit of deposits) {
    const bucket = resolveSellerCustodyCountBucket(deposit);
    if (!bucket) continue;
    counts[bucket] += 1;
  }

  return counts;
}

export function groupSellerCustodyWorkspace(
  deposits: readonly CollectibleSourceDeposit[]
): SellerCustodyWorkspaceGroups {
  const history = deposits
    .filter(isSellerCustodyHistoryDeposit)
    .sort((a, b) => compareSellerCustodyPriority(a, b));

  const activeSorted = deposits
    .filter(deposit => !isSellerCustodyHistoryDeposit(deposit))
    .sort((a, b) => compareSellerCustodyPriority(a, b));

  const nextAction = activeSorted[0] ?? null;
  const active = nextAction ? activeSorted.slice(1) : activeSorted;

  return {
    counts: resolveSellerCustodyCounts(deposits),
    nextAction,
    active,
    history,
  };
}

export interface CollectibleCaseTitle {
  title: string;
  fallbackKey: string;
  fallbackParams?: Record<string, string | number>;
}

function resolveCollectibleGradeOnlyFallback(grade: string): CollectibleCaseTitle {
  return {
    title: '',
    fallbackKey: 'collectibles.catalog.display.gradedCollectible',
    fallbackParams: { grade },
  };
}

/** Human-readable case title: cert · grade · serial with safe fallbacks. */
export function formatCollectibleCaseTitle(
  deposit: Pick<CollectibleSourceDeposit, 'certNumber' | 'grade' | 'serial'>,
  fallbackKey = 'collectibles.experience.case.unnamed'
): CollectibleCaseTitle {
  const cert = deposit.certNumber?.trim();
  const grade = deposit.grade?.trim();
  const serial = deposit.serial?.trim();
  const displayCert = cert && !isCollectibleSyntheticCatalogIdentifier(cert) ? cert : undefined;
  const displaySerial =
    serial && !isCollectibleSyntheticCatalogIdentifier(serial) ? serial : undefined;
  const gradeLabel = grade ? `Grade ${grade}` : undefined;

  const parts = [displayCert, gradeLabel, displaySerial && `#${displaySerial}`].filter(
    Boolean
  ) as string[];

  if (parts.length === 0) {
    return grade ? resolveCollectibleGradeOnlyFallback(grade) : { title: '', fallbackKey };
  }

  if (parts.length === 1 && grade && parts[0] === gradeLabel) {
    return resolveCollectibleGradeOnlyFallback(grade);
  }

  return { title: parts.join(' · '), fallbackKey };
}

export function resolveCollectibleCaseDisplayName(
  deposit: Pick<CollectibleSourceDeposit, 'certNumber' | 'grade' | 'serial'>,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const formatted = formatCollectibleCaseTitle(deposit);
  return formatted.title || t(formatted.fallbackKey, formatted.fallbackParams);
}

export type SellerCustodyLocationI18nKey =
  | 'collectibles.sellerCustody.location.withSeller'
  | 'collectibles.sellerCustody.location.inReview'
  | 'collectibles.sellerCustody.location.listed'
  | 'collectibles.sellerCustody.location.shipPending'
  | 'collectibles.sellerCustody.location.shipped'
  | 'collectibles.sellerCustody.location.closed'
  | 'collectibles.sellerCustody.location.unknown';

export function resolveSellerCustodyLocationKey(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): SellerCustodyLocationI18nKey {
  switch (normalizeStatus(deposit.status)) {
    case 'submitted':
    case 'rejected':
      return 'collectibles.sellerCustody.location.inReview';
    case 'source_held':
    case 'minting':
      return 'collectibles.sellerCustody.location.withSeller';
    case 'minted':
    case 'in_circulation':
      return 'collectibles.sellerCustody.location.listed';
    case 'redeem_requested':
      return 'collectibles.sellerCustody.location.shipPending';
    case 'shipped':
      return 'collectibles.sellerCustody.location.shipped';
    case 'settled':
    case 'defaulted':
      return 'collectibles.sellerCustody.location.closed';
    default:
      return 'collectibles.sellerCustody.location.unknown';
  }
}

export type SellerCustodyCheckedI18nKey =
  | 'collectibles.sellerCustody.checked.evidenceSubmitted'
  | 'collectibles.sellerCustody.checked.approved'
  | 'collectibles.sellerCustody.checked.titleMinted'
  | 'collectibles.sellerCustody.checked.inBuyerCustody'
  | 'collectibles.sellerCustody.checked.shipRecorded'
  | 'collectibles.sellerCustody.checked.complete'
  | 'collectibles.sellerCustody.checked.rejected'
  | 'collectibles.sellerCustody.checked.pending';

export function resolveSellerCustodyCheckedKey(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): SellerCustodyCheckedI18nKey {
  switch (normalizeStatus(deposit.status)) {
    case 'submitted':
      return 'collectibles.sellerCustody.checked.evidenceSubmitted';
    case 'source_held':
      return 'collectibles.sellerCustody.checked.approved';
    case 'minting':
      return 'collectibles.sellerCustody.checked.approved';
    case 'minted':
      return 'collectibles.sellerCustody.checked.titleMinted';
    case 'in_circulation':
      return 'collectibles.sellerCustody.checked.inBuyerCustody';
    case 'redeem_requested':
      return 'collectibles.sellerCustody.checked.inBuyerCustody';
    case 'shipped':
      return 'collectibles.sellerCustody.checked.shipRecorded';
    case 'settled':
      return 'collectibles.sellerCustody.checked.complete';
    case 'rejected':
      return 'collectibles.sellerCustody.checked.rejected';
    case 'defaulted':
      return 'collectibles.sellerCustody.checked.rejected';
    default:
      return 'collectibles.sellerCustody.checked.pending';
  }
}
