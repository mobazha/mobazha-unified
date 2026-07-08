// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  summarizeDealCommissionStatementCounts,
  type DealCommissionStatementStatusCounts,
} from '../utils/dealCommissionStatement';
import {
  getDealCommissionStatementsSnapshot,
  subscribeDealCommissionStatements,
} from './dealCommissionStatementsStore';
import { useDealCommissionStatements } from './useDealCommissionStatements';

const EMPTY_COUNTS: DealCommissionStatementStatusCounts = {
  total: 0,
  needingAttention: 0,
  pendingReview: 0,
  observed: 0,
  reversed: 0,
  settled: 0,
  disputed: 0,
};

export function useDealLinksAttributionCounts(enabled = true): DealCommissionStatementStatusCounts {
  const { statements } = useDealCommissionStatements('seller', enabled);
  return useMemo(
    () => (enabled ? summarizeDealCommissionStatementCounts(statements) : EMPTY_COUNTS),
    [enabled, statements]
  );
}

/** Cached counts for sidebar badges without triggering fetch. */
export function useCachedDealLinksAttributionCounts(): DealCommissionStatementStatusCounts {
  const snapshot = useSyncExternalStore(
    listener => subscribeDealCommissionStatements('seller', listener),
    () => getDealCommissionStatementsSnapshot('seller'),
    () => getDealCommissionStatementsSnapshot('seller')
  );

  return useMemo(
    () => summarizeDealCommissionStatementCounts(snapshot.statements),
    [snapshot.statements]
  );
}
