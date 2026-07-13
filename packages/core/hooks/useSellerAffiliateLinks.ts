// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listSellerAffiliateLinks,
  revokeSellerAffiliateLink,
} from '../services/api/sellerAffiliate';
import type { SellerAffiliateLink } from '../types/sellerAffiliate';

export interface UseSellerAffiliateLinksReturn {
  links: SellerAffiliateLink[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  revoke: (linkID: string) => Promise<void>;
}

export function useSellerAffiliateLinks(
  programID: string | undefined
): UseSellerAffiliateLinksReturn {
  const [links, setLinks] = useState<SellerAffiliateLink[]>([]);
  const [loading, setLoading] = useState(Boolean(programID));
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async (): Promise<void> => {
    if (!programID) {
      setLinks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setLinks(await listSellerAffiliateLinks(programID));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [programID]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const revoke = useCallback(
    async (linkID: string): Promise<void> => {
      if (!programID) return;
      const next = await revokeSellerAffiliateLink(programID, linkID);
      setLinks(current => current.map(link => (link.id === next.id ? next : link)));
    },
    [programID]
  );

  return useMemo(
    () => ({ links, loading, error, reload, revoke }),
    [links, loading, error, reload, revoke]
  );
}
