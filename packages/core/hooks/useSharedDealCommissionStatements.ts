// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { listDealCommissionStatements } from '../services/api/dealCommissionStatement';
import type { DealCommissionStatementAudience } from '../types/dealCommissionStatement';
import {
  getDealCommissionStatementsSnapshot,
  loadDealCommissionStatements,
  setDealCommissionStatementsReload,
  subscribeDealCommissionStatements,
} from './dealCommissionStatementsStore';
import type { UseDealCommissionStatementsReturn } from './useDealCommissionStatements';

export function useSharedDealCommissionStatements(
  audience: DealCommissionStatementAudience,
  enabled = true
): UseDealCommissionStatementsReturn {
  const reload = useCallback(async () => {
    if (!enabled) return;
    await loadDealCommissionStatements(audience, () => listDealCommissionStatements(audience), {
      force: true,
    });
  }, [audience, enabled]);

  useEffect(() => {
    setDealCommissionStatementsReload(audience, reload);
  }, [audience, reload]);

  useEffect(() => {
    if (!enabled) return;
    void loadDealCommissionStatements(audience, () => listDealCommissionStatements(audience));
  }, [audience, enabled]);

  const snapshot = useSyncExternalStore(
    useCallback(listener => subscribeDealCommissionStatements(audience, listener), [audience]),
    () => getDealCommissionStatementsSnapshot(audience),
    () => getDealCommissionStatementsSnapshot(audience)
  );

  return useMemo(
    () => ({
      statements: enabled ? snapshot.statements : [],
      loading: enabled ? snapshot.loading : false,
      error: enabled ? snapshot.error : null,
      reload,
    }),
    [enabled, reload, snapshot.error, snapshot.loading, snapshot.statements]
  );
}
