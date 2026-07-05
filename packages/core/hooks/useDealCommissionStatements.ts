// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listDealCommissionStatements } from '../services/api/dealCommissionStatement';
import type {
  DealCommissionStatement,
  DealCommissionStatementAudience,
} from '../types/dealCommissionStatement';

export interface UseDealCommissionStatementsReturn {
  statements: DealCommissionStatement[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useDealCommissionStatements(
  audience: DealCommissionStatementAudience,
  enabled = true
): UseDealCommissionStatementsReturn {
  const [statements, setStatements] = useState<DealCommissionStatement[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setStatements([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await listDealCommissionStatements(audience);
      setStatements(next);
    } catch (err) {
      setStatements([]);
      setError(err instanceof Error ? err.message : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [audience, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return useMemo(
    () => ({
      statements,
      loading,
      error,
      reload,
    }),
    [statements, loading, error, reload]
  );
}
