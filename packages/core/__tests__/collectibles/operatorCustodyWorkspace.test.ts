// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import type { CollectibleHubSlot } from '../../collectibles/types';
import type { CollectiblePrimarySale } from '../../collectibles/types';
import type { CollectibleRedemption } from '../../collectibles/types';
import type { CollectibleSourceDeposit } from '../../collectibles/types';
import {
  formatRedemptionCaseTitle,
  isActionableHubSlot,
  isClosedHubSlot,
  isOperatorIntakeReviewHubSlot,
  isOperatorIntakeReviewSourceDeposit,
  isOperatorMintExceptionHubSlot,
  isOperatorMintExceptionReleaseRecord,
  isOperatorMintExceptionSourceDeposit,
  isOperatorRedemptionFulfillmentSourceDeposit,
  isOperatorReleaseClosedHubSlot,
  isOperatorReleaseClosedReleaseRecord,
  isOperatorReleaseClosedSourceDeposit,
  partitionOperatorCustodyWorkspace,
  resolveDefaultOperatorCustodyQueue,
  resolveOperatorCustodyMetricsFromPartitions,
  type OperatorCustodyQueuePartitions,
} from '../../collectibles/operatorCustodyWorkspace';

function deposit(
  overrides: Partial<CollectibleSourceDeposit> & Pick<CollectibleSourceDeposit, 'sourceDepositID'>
): CollectibleSourceDeposit {
  return {
    certNumber: 'PSA-1',
    status: 'submitted',
    ...overrides,
  };
}

function hubSlot(
  overrides: Partial<CollectibleHubSlot> & Pick<CollectibleHubSlot, 'hubSlotID'>
): CollectibleHubSlot {
  return {
    certNumber: 'PSA-1',
    status: 'received',
    ...overrides,
  };
}

function releaseRecord(
  overrides: Partial<CollectiblePrimarySale> & Pick<CollectiblePrimarySale, 'saleID' | 'hubSlotID'>
): CollectiblePrimarySale {
  return {
    releaseStatus: 'pending',
    ...overrides,
  };
}

function redemption(
  overrides: Partial<CollectibleRedemption> & Pick<CollectibleRedemption, 'redemptionID'>
): CollectibleRedemption {
  return {
    status: 'redeem_requested',
    requesterWallet: 'wallet',
    burnTxSignature: 'burn',
    nftMint: 'mint',
    ...overrides,
  };
}

function countPartitionRows(partitions: OperatorCustodyQueuePartitions): number {
  return (
    partitions.redemptionFulfillment.pendingRedemptions.length +
    partitions.redemptionFulfillment.sourceDeposits.length +
    partitions.mintExceptions.failedReleases.length +
    partitions.mintExceptions.sourceDeposits.length +
    partitions.mintExceptions.hubSlots.length +
    partitions.intakeReview.sourceDeposits.length +
    partitions.intakeReview.hubSlots.length +
    partitions.releaseClosed.sourceDeposits.length +
    partitions.releaseClosed.hubSlots.length +
    partitions.releaseClosed.releaseRecords.length
  );
}

describe('operatorCustodyWorkspace', () => {
  const emptyInput = {
    sourceDeposits: [],
    pendingRedemptions: [],
    releaseQueue: [],
    hubSlots: [],
  };

  it('prefers redemption fulfillment over mint exceptions and intake', () => {
    const { metrics } = partitionOperatorCustodyWorkspace({
      ...emptyInput,
      pendingRedemptions: [redemption({ redemptionID: 'r1' })],
      releaseQueue: [releaseRecord({ saleID: 's1', hubSlotID: 'h1', releaseStatus: 'failed' })],
      sourceDeposits: [deposit({ sourceDepositID: 'd1', status: 'submitted' })],
    });

    expect(resolveDefaultOperatorCustodyQueue(metrics)).toBe('redemption-fulfillment');
  });

  it('prefers mint exceptions when redemption queue is clear', () => {
    const { metrics } = partitionOperatorCustodyWorkspace({
      ...emptyInput,
      releaseQueue: [releaseRecord({ saleID: 's1', hubSlotID: 'h1', releaseStatus: 'failed' })],
      sourceDeposits: [deposit({ sourceDepositID: 'd1', status: 'submitted' })],
    });

    expect(resolveDefaultOperatorCustodyQueue(metrics)).toBe('mint-exceptions');
  });

  it('falls back to release-closed when every queue is empty', () => {
    expect(
      resolveDefaultOperatorCustodyQueue(partitionOperatorCustodyWorkspace(emptyInput).metrics)
    ).toBe('release-closed');
  });

  it('uses a human redemption request title instead of raw identifiers', () => {
    const title = formatRedemptionCaseTitle({
      redemptionID: 'red-1',
      nftMint: 'mint-abc',
    });

    expect(title.title).toBe('');
    expect(title.fallbackKey).toBe('collectibles.experience.case.redemptionRequest');
  });

  it('routes received hub intake to intake-review and minting slots to mint-exceptions', () => {
    expect(isOperatorIntakeReviewHubSlot({ status: 'received' })).toBe(true);
    expect(isOperatorMintExceptionHubSlot({ status: 'minting' })).toBe(true);
    expect(isOperatorReleaseClosedHubSlot({ status: 'minted' })).toBe(true);
    expect(isActionableHubSlot({ status: 'received' })).toBe(true);
    expect(isActionableHubSlot({ status: 'minting' })).toBe(false);
    expect(isClosedHubSlot({ status: 'minting' })).toBe(false);

    const { partitions, metrics } = partitionOperatorCustodyWorkspace({
      ...emptyInput,
      hubSlots: [
        hubSlot({ hubSlotID: 'slot-intake', status: 'received' }),
        hubSlot({ hubSlotID: 'slot-minting', status: 'minting' }),
        hubSlot({ hubSlotID: 'slot-closed', status: 'minted' }),
      ],
    });

    expect(partitions.intakeReview.hubSlots.map(slot => slot.hubSlotID)).toEqual(['slot-intake']);
    expect(partitions.mintExceptions.hubSlots.map(slot => slot.hubSlotID)).toEqual([
      'slot-minting',
    ]);
    expect(partitions.releaseClosed.hubSlots.map(slot => slot.hubSlotID)).toEqual(['slot-closed']);
    expect(metrics.intakeReview).toBe(1);
    expect(metrics.mintExceptions).toBe(1);
    expect(metrics.releaseClosed).toBe(1);
  });

  it('keeps source-held waiting on seller listing in release-closed, not intake-review', () => {
    const held = deposit({ sourceDepositID: 'held', status: 'source_held' });
    expect(isOperatorIntakeReviewSourceDeposit(held)).toBe(false);
    expect(isOperatorMintExceptionSourceDeposit(held)).toBe(false);
    expect(isOperatorReleaseClosedSourceDeposit(held)).toBe(true);

    const { partitions } = partitionOperatorCustodyWorkspace({
      ...emptyInput,
      sourceDeposits: [held],
    });

    expect(partitions.releaseClosed.sourceDeposits).toHaveLength(1);
    expect(partitions.intakeReview.sourceDeposits).toHaveLength(0);
  });

  it('routes mint exceptions and healthy release records to distinct queues', () => {
    const { partitions, metrics } = partitionOperatorCustodyWorkspace({
      ...emptyInput,
      releaseQueue: [
        releaseRecord({ saleID: 'failed', hubSlotID: 'h1', releaseStatus: 'failed' }),
        releaseRecord({ saleID: 'released', hubSlotID: 'h2', releaseStatus: 'released' }),
      ],
      sourceDeposits: [deposit({ sourceDepositID: 'minting', status: 'minting' })],
    });

    expect(partitions.mintExceptions.failedReleases.map(sale => sale.saleID)).toEqual(['failed']);
    expect(partitions.releaseClosed.releaseRecords.map(sale => sale.saleID)).toEqual(['released']);
    expect(isOperatorMintExceptionReleaseRecord({ releaseStatus: 'failed' })).toBe(true);
    expect(isOperatorReleaseClosedReleaseRecord({ releaseStatus: 'released' })).toBe(true);
    expect(metrics.mintExceptions).toBe(2);
    expect(metrics.releaseClosed).toBe(1);
  });

  it('partitions every source deposit status into exactly one queue with no duplicates', () => {
    const statuses = [
      'submitted',
      'source_held',
      'rejected',
      'minting',
      'minted',
      'in_circulation',
      'redeem_requested',
      'shipped',
      'settled',
      'defaulted',
    ] as const;

    const sourceDeposits = statuses.map((status, index) =>
      deposit({ sourceDepositID: `dep-${index}`, status })
    );

    const { partitions } = partitionOperatorCustodyWorkspace({
      ...emptyInput,
      sourceDeposits,
    });

    const assigned = [
      ...partitions.redemptionFulfillment.sourceDeposits,
      ...partitions.mintExceptions.sourceDeposits,
      ...partitions.intakeReview.sourceDeposits,
      ...partitions.releaseClosed.sourceDeposits,
    ].map(item => item.sourceDepositID);

    expect(assigned).toHaveLength(statuses.length);
    expect(new Set(assigned).size).toBe(statuses.length);
    expect(assigned.sort()).toEqual(sourceDeposits.map(item => item.sourceDepositID).sort());

    expect(partitions.intakeReview.sourceDeposits.map(item => item.status)).toEqual(['submitted']);
    expect(partitions.redemptionFulfillment.sourceDeposits.map(item => item.status).sort()).toEqual(
      ['redeem_requested', 'shipped']
    );
    expect(partitions.mintExceptions.sourceDeposits.map(item => item.status)).toEqual(['minting']);
    expect(partitions.releaseClosed.sourceDeposits.map(item => item.status).sort()).toEqual([
      'defaulted',
      'in_circulation',
      'minted',
      'rejected',
      'settled',
      'source_held',
    ]);
  });

  it('derives metrics from partition row counts exactly', () => {
    const { partitions, metrics } = partitionOperatorCustodyWorkspace({
      sourceDeposits: [
        deposit({ sourceDepositID: 'd-open', status: 'submitted' }),
        deposit({ sourceDepositID: 'd-closed', status: 'settled' }),
        deposit({ sourceDepositID: 'd-ship', status: 'shipped' }),
      ],
      pendingRedemptions: [redemption({ redemptionID: 'red-1' })],
      releaseQueue: [
        releaseRecord({ saleID: 'sale-failed', hubSlotID: 'h1', releaseStatus: 'failed' }),
        releaseRecord({ saleID: 'sale-ok', hubSlotID: 'h2', releaseStatus: 'released' }),
      ],
      hubSlots: [
        hubSlot({ hubSlotID: 'slot-open', status: 'received' }),
        hubSlot({ hubSlotID: 'slot-minting', status: 'minting' }),
        hubSlot({ hubSlotID: 'slot-closed', status: 'minted' }),
      ],
    });

    const expected = resolveOperatorCustodyMetricsFromPartitions(partitions);
    expect(metrics).toEqual(expected);
    expect(metrics.intakeReview).toBe(2);
    expect(metrics.mintExceptions).toBe(2);
    expect(metrics.redemptionFulfillment).toBe(2);
    expect(metrics.releaseClosed).toBe(3);
    expect(metrics.needsAttention).toBe(metrics.redemptionFulfillment + metrics.mintExceptions);
    expect(countPartitionRows(partitions)).toBe(9);
  });
});
