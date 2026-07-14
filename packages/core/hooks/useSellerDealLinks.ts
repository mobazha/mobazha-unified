// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listSellerDealLinks } from '../services/api/sellerDealLink';
import type { SellerDealLink } from '../types/sellerDealLink';

export interface UseSellerDealLinksReturn {
  links: SellerDealLink[];
  loading: boolean;
  error: string | null;
  /**
   * The raw thrown value behind {@link error}, kept so a caller can classify a
   * typed store-credential denial (`error.code`) rather than only show a
   * generic message. `null` when there is no error.
   */
  errorCause: unknown;
  reload: () => Promise<void>;
}

/**
 * Seller-owned Deal Links for the admin list. A monotonic request id guards
 * against races: a slow in-flight load (or one left in flight at unmount) never
 * overwrites the result of a newer reload.
 */
export function useSellerDealLinks(enabled = true): UseSellerDealLinksReturn {
  const [links, setLinks] = useState<SellerDealLink[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [errorCause, setErrorCause] = useState<unknown>(null);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);

  const reload = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setLinks([]);
      setLoading(false);
      return;
    }
    const requestID = ++requestRef.current;
    setLoading(true);
    setError(null);
    setErrorCause(null);
    try {
      const result = await listSellerDealLinks();
      // Drop a stale result: superseded by a newer reload, or unmounted.
      if (!mountedRef.current || requestRef.current !== requestID) return;
      setLinks(result);
    } catch (cause) {
      if (!mountedRef.current || requestRef.current !== requestID) return;
      setError(cause instanceof Error ? cause.message : 'load_failed');
      setErrorCause(cause);
    } finally {
      if (mountedRef.current && requestRef.current === requestID) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    void reload();
    return () => {
      mountedRef.current = false;
    };
  }, [reload]);

  return useMemo(
    () => ({ links, loading, error, errorCause, reload }),
    [links, loading, error, errorCause, reload]
  );
}
