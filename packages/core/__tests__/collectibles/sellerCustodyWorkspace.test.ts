// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  formatCollectibleCaseTitle,
  groupSellerCustodyWorkspace,
  isSellerCustodyHistoryDeposit,
  resolveCollectibleCaseDisplayName,
  resolveSellerCustodyPriority,
  SELLER_CUSTODY_WORKSPACE_PREVIEW_LIMIT,
} from '../../collectibles/sellerCustodyWorkspace';
import type { CollectibleSourceDeposit } from '../../collectibles/types';

function deposit(
  partial: Partial<CollectibleSourceDeposit> &
    Pick<CollectibleSourceDeposit, 'sourceDepositID' | 'status'>
): CollectibleSourceDeposit {
  return {
    certNumber: 'PSA-1',
    grade: '10',
    sellerPeerID: 'seller',
    holderWallet: 'holder',
    createdAt: '2026-01-01T00:00:00Z',
    ...partial,
  } as CollectibleSourceDeposit;
}

describe('sellerCustodyWorkspace', () => {
  it('treats rejected, defaulted, and settled as history', () => {
    expect(isSellerCustodyHistoryDeposit({ status: 'rejected' })).toBe(true);
    expect(isSellerCustodyHistoryDeposit({ status: 'defaulted' })).toBe(true);
    expect(isSellerCustodyHistoryDeposit({ status: 'settled' })).toBe(true);
    expect(isSellerCustodyHistoryDeposit({ status: 'redeem_requested' })).toBe(false);
  });

  it('prioritizes redemption shipment over create-listing and review-waiting', () => {
    expect(
      resolveSellerCustodyPriority(deposit({ sourceDepositID: 'a', status: 'redeem_requested' }))
    ).toBeLessThan(
      resolveSellerCustodyPriority(deposit({ sourceDepositID: 'b', status: 'source_held' }))
    );
    expect(
      resolveSellerCustodyPriority(deposit({ sourceDepositID: 'b', status: 'source_held' }))
    ).toBeLessThan(
      resolveSellerCustodyPriority(deposit({ sourceDepositID: 'c', status: 'submitted' }))
    );
    expect(
      resolveSellerCustodyPriority(deposit({ sourceDepositID: 'd', status: 'rejected' }))
    ).toBeGreaterThan(
      resolveSellerCustodyPriority(deposit({ sourceDepositID: 'c', status: 'submitted' }))
    );
  });

  it('groups next action, active, and history buckets', () => {
    const groups = groupSellerCustodyWorkspace([
      deposit({ sourceDepositID: 'held', status: 'source_held' }),
      deposit({ sourceDepositID: 'ship', status: 'redeem_requested' }),
      deposit({ sourceDepositID: 'closed', status: 'settled' }),
    ]);

    expect(groups.nextAction?.sourceDepositID).toBe('ship');
    expect(groups.active.map(item => item.sourceDepositID)).toEqual(['held']);
    expect(groups.history.map(item => item.sourceDepositID)).toEqual(['closed']);
    expect(groups.counts.needsAction).toBe(1);
    expect(groups.counts.readyToList).toBe(1);
  });

  it('omits synthetic E2E cert identifiers from seller case titles', () => {
    const titled = formatCollectibleCaseTitle({
      certNumber: 'E2E-SEED-PSA-1783',
      grade: 'PSA 10',
      serial: '001',
    });

    expect(titled.title).toBe('Grade PSA 10 · #001');
    expect(titled.title).not.toContain('E2E-SEED');
  });

  it('uses graded collectible fallback when only synthetic serials remain', () => {
    const titled = formatCollectibleCaseTitle({
      certNumber: 'E2E-SEED-PSA-1783',
      grade: 'PSA 10',
      serial: 'SER-COLLATERAL-UNFUNDED-1783-ABCD',
    });

    expect(titled.title).toBe('');
    expect(titled.fallbackKey).toBe('collectibles.catalog.display.gradedCollectible');
    expect(titled.fallbackParams).toEqual({ grade: 'PSA 10' });
    expect(
      resolveCollectibleCaseDisplayName(
        {
          certNumber: 'E2E-SEED-PSA-1783',
          grade: 'PSA 10',
          serial: 'SER-COLLATERAL-FUNDED-1783-ABCD',
        },
        (key, params) => `${key}:${params?.grade ?? ''}`
      )
    ).toBe('collectibles.catalog.display.gradedCollectible:PSA 10');
  });

  it('preserves legitimate human cert and serial in seller case titles', () => {
    const titled = formatCollectibleCaseTitle({
      certNumber: 'PSA 12345678',
      grade: 'PSA 10',
      serial: 'WILSON-001',
    });

    expect(titled.title).toBe('PSA 12345678 · Grade PSA 10 · #WILSON-001');
  });

  it('exports a seller workspace preview limit for list truncation', () => {
    expect(SELLER_CUSTODY_WORKSPACE_PREVIEW_LIMIT).toBe(5);
  });
});
