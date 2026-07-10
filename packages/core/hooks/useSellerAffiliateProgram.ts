// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getSellerAffiliateProgram,
  putSellerAffiliateProgram,
} from '../services/api/sellerAffiliate';
import type {
  SellerAffiliateProgram,
  SellerAffiliateProgramRequest,
} from '../types/sellerAffiliate';

export interface UseSellerAffiliateProgramReturn {
  program: SellerAffiliateProgram | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  save: (input: SellerAffiliateProgramRequest) => Promise<SellerAffiliateProgram>;
}

export function useSellerAffiliateProgram(enabled = true): UseSellerAffiliateProgramReturn {
  const [program, setProgram] = useState<SellerAffiliateProgram | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setProgram(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setProgram(await getSellerAffiliateProgram());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'load_failed';
      // A seller without a program configures one through save; do not surface a 404 as a page failure.
      if (message.toLowerCase().includes('not found')) setProgram(null);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (input: SellerAffiliateProgramRequest): Promise<SellerAffiliateProgram> => {
      const next = await putSellerAffiliateProgram(input);
      setProgram(next);
      setError(null);
      return next;
    },
    []
  );

  return useMemo(
    () => ({ program, loading, error, reload, save }),
    [program, loading, error, reload, save]
  );
}
