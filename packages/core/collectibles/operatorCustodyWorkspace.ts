// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { CollectiblePrimarySale } from './types';
import type { CollectibleRedemption } from './types';
import type { CollectibleHubSlot } from './types';
import type { CollectibleSourceDeposit } from './types';
import {
  isSourceDepositDefaultRefundRefreshEligible,
  isSourceDepositDefaultRefundRetryEligible,
  isSourceDepositMintEligible,
  isSourceDepositReviewPending,
} from './sourceDeposit';
import { formatCollectibleCaseTitle } from './sellerCustodyWorkspace';

export type OperatorCustodyQueueId =
  | 'redemption-fulfillment'
  | 'mint-exceptions'
  | 'intake-review'
  | 'release-closed';

export interface OperatorCustodyMetrics {
  needsAttention: number;
  intakeReview: number;
  mintExceptions: number;
  redemptionFulfillment: number;
  releaseClosed: number;
}

/** @deprecated Prefer OperatorCustodyWorkspaceInput with partitionOperatorCustodyWorkspace. */
export interface OperatorCustodyMetricsInput {
  sourceDeposits: readonly CollectibleSourceDeposit[];
  pendingRedemptions: readonly CollectibleRedemption[];
  failedReleases: readonly CollectiblePrimarySale[];
  mintingSlots: readonly CollectibleHubSlot[];
  actionableHubSlots: readonly CollectibleHubSlot[];
  closedHubSlots?: readonly CollectibleHubSlot[];
}

export interface OperatorCustodyWorkspaceInput {
  sourceDeposits: readonly CollectibleSourceDeposit[];
  pendingRedemptions: readonly CollectibleRedemption[];
  releaseQueue: readonly CollectiblePrimarySale[];
  hubSlots: readonly CollectibleHubSlot[];
}

export interface OperatorCustodyQueuePartitions {
  redemptionFulfillment: {
    pendingRedemptions: CollectibleRedemption[];
    sourceDeposits: CollectibleSourceDeposit[];
  };
  mintExceptions: {
    failedReleases: CollectiblePrimarySale[];
    sourceDeposits: CollectibleSourceDeposit[];
    hubSlots: CollectibleHubSlot[];
  };
  intakeReview: {
    sourceDeposits: CollectibleSourceDeposit[];
    hubSlots: CollectibleHubSlot[];
  };
  releaseClosed: {
    sourceDeposits: CollectibleSourceDeposit[];
    hubSlots: CollectibleHubSlot[];
    releaseRecords: CollectiblePrimarySale[];
  };
}

function normalizeStatus(status: string | undefined): string {
  return (status ?? '').trim().toLowerCase();
}

/** Seller custody shipments still awaiting operator fulfillment. */
export function isOperatorRedemptionFulfillmentSourceDeposit(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): boolean {
  const status = normalizeStatus(deposit.status);
  return status === 'redeem_requested' || status === 'shipped';
}

/** Submitted seller custody cases awaiting operator intake review. */
export function isOperatorIntakeReviewSourceDeposit(
  deposit: Pick<CollectibleSourceDeposit, 'status'>
): boolean {
  return isSourceDepositReviewPending(deposit);
}

/** Mint, recovery, and default-refund exceptions that need operator intervention. */
export function isOperatorMintExceptionSourceDeposit(
  deposit: Pick<
    CollectibleSourceDeposit,
    'status' | 'firstSaleOrderID' | 'nftMint' | 'defaultRefundStatus'
  >
): boolean {
  if (normalizeStatus(deposit.status) === 'minting') return true;
  if (isSourceDepositMintEligible(deposit)) return true;
  if (isSourceDepositDefaultRefundRefreshEligible(deposit)) return true;
  if (isSourceDepositDefaultRefundRetryEligible(deposit)) return true;
  return false;
}

/** Healthy or terminal seller custody records with no urgent queue action. */
export function isOperatorReleaseClosedSourceDeposit(
  deposit: Pick<
    CollectibleSourceDeposit,
    'status' | 'firstSaleOrderID' | 'nftMint' | 'defaultRefundStatus'
  >
): boolean {
  if (isOperatorRedemptionFulfillmentSourceDeposit(deposit)) return false;
  if (isOperatorIntakeReviewSourceDeposit(deposit)) return false;
  if (isOperatorMintExceptionSourceDeposit(deposit)) return false;
  return true;
}

/** Received hub intake slots awaiting operator intake actions. */
export function isOperatorIntakeReviewHubSlot(slot: Pick<CollectibleHubSlot, 'status'>): boolean {
  return normalizeStatus(slot.status) === 'received';
}

/** Minting hub slots pending recovery — mint exceptions queue. */
export function isOperatorMintExceptionHubSlot(slot: Pick<CollectibleHubSlot, 'status'>): boolean {
  return normalizeStatus(slot.status) === 'minting';
}

/** Minted, rejected, and other non-actionable hub slots. */
export function isOperatorReleaseClosedHubSlot(slot: Pick<CollectibleHubSlot, 'status'>): boolean {
  return !isOperatorIntakeReviewHubSlot(slot) && !isOperatorMintExceptionHubSlot(slot);
}

/** Failed primary-sale release retries belong in mint exceptions. */
export function isOperatorMintExceptionReleaseRecord(
  sale: Pick<CollectiblePrimarySale, 'releaseStatus'>
): boolean {
  return normalizeStatus(sale.releaseStatus) === 'failed';
}

/** Healthy or completed release records belong in closed history. */
export function isOperatorReleaseClosedReleaseRecord(
  sale: Pick<CollectiblePrimarySale, 'releaseStatus'>
): boolean {
  return !isOperatorMintExceptionReleaseRecord(sale);
}

/** @deprecated Use isOperatorIntakeReviewHubSlot — minting slots are mint exceptions. */
export function isActionableHubSlot(slot: Pick<CollectibleHubSlot, 'status'>): boolean {
  return isOperatorIntakeReviewHubSlot(slot);
}

/** @deprecated Use isOperatorReleaseClosedHubSlot. */
export function isClosedHubSlot(slot: Pick<CollectibleHubSlot, 'status'>): boolean {
  return isOperatorReleaseClosedHubSlot(slot);
}

export function partitionOperatorCustodyWorkspace(input: OperatorCustodyWorkspaceInput): {
  partitions: OperatorCustodyQueuePartitions;
  metrics: OperatorCustodyMetrics;
} {
  const redemptionFulfillmentSourceDeposits = input.sourceDeposits.filter(
    isOperatorRedemptionFulfillmentSourceDeposit
  );
  const intakeReviewSourceDeposits = input.sourceDeposits.filter(
    isOperatorIntakeReviewSourceDeposit
  );
  const mintExceptionSourceDeposits = input.sourceDeposits.filter(
    isOperatorMintExceptionSourceDeposit
  );
  const releaseClosedSourceDeposits = input.sourceDeposits.filter(
    isOperatorReleaseClosedSourceDeposit
  );

  const intakeReviewHubSlots = input.hubSlots.filter(isOperatorIntakeReviewHubSlot);
  const mintExceptionHubSlots = input.hubSlots.filter(isOperatorMintExceptionHubSlot);
  const releaseClosedHubSlots = input.hubSlots.filter(isOperatorReleaseClosedHubSlot);

  const mintExceptionReleases = input.releaseQueue.filter(isOperatorMintExceptionReleaseRecord);
  const releaseClosedReleases = input.releaseQueue.filter(isOperatorReleaseClosedReleaseRecord);

  const partitions: OperatorCustodyQueuePartitions = {
    redemptionFulfillment: {
      pendingRedemptions: [...input.pendingRedemptions],
      sourceDeposits: redemptionFulfillmentSourceDeposits,
    },
    mintExceptions: {
      failedReleases: mintExceptionReleases,
      sourceDeposits: mintExceptionSourceDeposits,
      hubSlots: mintExceptionHubSlots,
    },
    intakeReview: {
      sourceDeposits: intakeReviewSourceDeposits,
      hubSlots: intakeReviewHubSlots,
    },
    releaseClosed: {
      sourceDeposits: releaseClosedSourceDeposits,
      hubSlots: releaseClosedHubSlots,
      releaseRecords: releaseClosedReleases,
    },
  };

  return {
    partitions,
    metrics: resolveOperatorCustodyMetricsFromPartitions(partitions),
  };
}

export function resolveOperatorCustodyMetricsFromPartitions(
  partitions: OperatorCustodyQueuePartitions
): OperatorCustodyMetrics {
  const redemptionFulfillment =
    partitions.redemptionFulfillment.pendingRedemptions.length +
    partitions.redemptionFulfillment.sourceDeposits.length;
  const mintExceptions =
    partitions.mintExceptions.failedReleases.length +
    partitions.mintExceptions.sourceDeposits.length +
    partitions.mintExceptions.hubSlots.length;
  const intakeReview =
    partitions.intakeReview.sourceDeposits.length + partitions.intakeReview.hubSlots.length;
  const releaseClosed =
    partitions.releaseClosed.sourceDeposits.length +
    partitions.releaseClosed.hubSlots.length +
    partitions.releaseClosed.releaseRecords.length;

  return {
    needsAttention: redemptionFulfillment + mintExceptions,
    intakeReview,
    mintExceptions,
    redemptionFulfillment,
    releaseClosed,
  };
}

/** @deprecated Prefer partitionOperatorCustodyWorkspace for metrics aligned with rendered rows. */
export function resolveOperatorCustodyMetrics(
  input: OperatorCustodyMetricsInput
): OperatorCustodyMetrics {
  return resolveOperatorCustodyMetricsFromPartitions({
    redemptionFulfillment: {
      pendingRedemptions: [...input.pendingRedemptions],
      sourceDeposits: input.sourceDeposits.filter(isOperatorRedemptionFulfillmentSourceDeposit),
    },
    mintExceptions: {
      failedReleases: [...input.failedReleases],
      sourceDeposits: input.sourceDeposits.filter(isOperatorMintExceptionSourceDeposit),
      hubSlots: [...input.mintingSlots],
    },
    intakeReview: {
      sourceDeposits: input.sourceDeposits.filter(isOperatorIntakeReviewSourceDeposit),
      hubSlots: input.actionableHubSlots.filter(isOperatorIntakeReviewHubSlot),
    },
    releaseClosed: {
      sourceDeposits: input.sourceDeposits.filter(isOperatorReleaseClosedSourceDeposit),
      hubSlots: input.closedHubSlots ? [...input.closedHubSlots] : [],
      releaseRecords: [],
    },
  });
}

/** Urgent-queue priority for default section selection. */
export function resolveDefaultOperatorCustodyQueue(
  metrics: OperatorCustodyMetrics
): OperatorCustodyQueueId {
  if (metrics.redemptionFulfillment > 0) return 'redemption-fulfillment';
  if (metrics.mintExceptions > 0) return 'mint-exceptions';
  if (metrics.intakeReview > 0) return 'intake-review';
  return 'release-closed';
}

export function formatOperatorCaseTitle(
  deposit: Pick<CollectibleSourceDeposit, 'certNumber' | 'grade' | 'serial'>
): { title: string; fallbackKey: string } {
  return formatCollectibleCaseTitle(deposit);
}

export function formatHubSlotCaseTitle(
  slot: Pick<CollectibleHubSlot, 'certNumber' | 'grade' | 'serial'>
): { title: string; fallbackKey: string } {
  return formatCollectibleCaseTitle(slot);
}

export function formatRedemptionCaseTitle(
  _redemption: Pick<CollectibleRedemption, 'nftMint' | 'redemptionID'>
): { title: string; fallbackKey: string } {
  return { title: '', fallbackKey: 'collectibles.experience.case.redemptionRequest' };
}

export function resolveOperatorCaseAgeTimestamp(
  record: { createdAt?: string; updatedAt?: string } | null | undefined
): string | undefined {
  if (!record) return undefined;
  return record.updatedAt?.trim() || record.createdAt?.trim() || undefined;
}
