// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useMemo, useState } from 'react';
import { createSellerAffiliateLink } from '../services/api/sellerAffiliate';
import type { SellerAffiliateLink } from '../types/sellerAffiliate';

export interface UseSellerAffiliateLinkReturn {
  link: SellerAffiliateLink | null;
  loading: boolean;
  error: string | null;
  ensureLink: (programID: string) => Promise<SellerAffiliateLink>;
}

export function useSellerAffiliateLink(): UseSellerAffiliateLinkReturn {
  const [link, setLink] = useState<SellerAffiliateLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureLink = useCallback(async (programID: string): Promise<SellerAffiliateLink> => {
    setLoading(true);
    setError(null);
    try {
      const next = await createSellerAffiliateLink(programID);
      setLink(next);
      return next;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'link_failed';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(() => ({ link, loading, error, ensureLink }), [link, loading, error, ensureLink]);
}
