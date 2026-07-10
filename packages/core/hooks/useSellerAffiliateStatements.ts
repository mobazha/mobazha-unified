// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listSellerAffiliateStatements } from '../services/api/sellerAffiliate';
import type {
  SellerAffiliateStatementAudience,
  SellerAffiliateStatementLine,
} from '../types/sellerAffiliate';

export interface UseSellerAffiliateStatementsReturn {
  statements: SellerAffiliateStatementLine[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useSellerAffiliateStatements(
  audience: SellerAffiliateStatementAudience,
  enabled = true
): UseSellerAffiliateStatementsReturn {
  const [statements, setStatements] = useState<SellerAffiliateStatementLine[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setStatements([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStatements(await listSellerAffiliateStatements(audience));
    } catch (cause) {
      setStatements([]);
      setError(cause instanceof Error ? cause.message : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [audience, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return useMemo(
    () => ({ statements, loading, error, reload }),
    [statements, loading, error, reload]
  );
}
