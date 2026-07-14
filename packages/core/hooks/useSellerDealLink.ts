// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSellerDealLink } from '../services/api/sellerDealLink';
import type { SellerDealLink } from '../types/sellerDealLink';

export interface UseSellerDealLinkReturn {
  link: SellerDealLink | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * A single seller-owned Deal Link by id, for the admin edit page. A monotonic
 * request id guards against races: a slow in-flight load (or one left in flight
 * at unmount) never overwrites the result of a newer reload.
 */
export function useSellerDealLink(dealLinkId: string): UseSellerDealLinkReturn {
  const enabled = dealLinkId.trim() !== '';
  const [link, setLink] = useState<SellerDealLink | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);

  const reload = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setLink(null);
      setLoading(false);
      return;
    }
    const requestID = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getSellerDealLink(dealLinkId);
      // Drop a stale result: superseded by a newer reload, or unmounted.
      if (!mountedRef.current || requestRef.current !== requestID) return;
      setLink(result);
    } catch (cause) {
      if (!mountedRef.current || requestRef.current !== requestID) return;
      setError(cause instanceof Error ? cause.message : 'load_failed');
    } finally {
      if (mountedRef.current && requestRef.current === requestID) setLoading(false);
    }
  }, [dealLinkId, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    void reload();
    return () => {
      mountedRef.current = false;
    };
  }, [reload]);

  return useMemo(() => ({ link, loading, error, reload }), [link, loading, error, reload]);
}
