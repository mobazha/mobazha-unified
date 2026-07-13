// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSellerAffiliateCapabilities } from '../services/api/sellerAffiliate';
import type { SellerAffiliateCapabilities } from '../types/sellerAffiliate';

export interface UseSellerAffiliateCapabilitiesReturn {
  capabilities: SellerAffiliateCapabilities | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useSellerAffiliateCapabilities(
  enabled = true
): UseSellerAffiliateCapabilitiesReturn {
  const [capabilities, setCapabilities] = useState<SellerAffiliateCapabilities | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setCapabilities(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCapabilities(await getSellerAffiliateCapabilities());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return useMemo(
    () => ({ capabilities, loading, error, reload }),
    [capabilities, loading, error, reload]
  );
}
