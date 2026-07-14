// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listSellerDealLinkOrders } from '../services/api/sellerDealLink';
import type { SellerDealLinkOrder } from '../types/sellerDealLink';

export interface UseSellerDealLinkOrdersOptions {
  /** Page size (1–100). Defaults to the backend default when omitted. */
  limit?: number;
  /** Row offset into the full result set. */
  offset?: number;
}

export interface UseSellerDealLinkOrdersReturn {
  orders: SellerDealLinkOrder[];
  total: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * The orders a seller's Deal Link produced, for the admin per-link order view.
 * limit/offset are part of the effect key, so changing the page re-fetches. A
 * monotonic request id guards against races: a slow in-flight load (or one left
 * in flight at unmount) never overwrites the result of a newer reload.
 */
export function useSellerDealLinkOrders(
  dealLinkId: string,
  options?: UseSellerDealLinkOrdersOptions
): UseSellerDealLinkOrdersReturn {
  const enabled = dealLinkId.trim() !== '';
  const limit = options?.limit;
  const offset = options?.offset;
  const [orders, setOrders] = useState<SellerDealLinkOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);

  const reload = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setOrders([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const requestID = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const page = await listSellerDealLinkOrders(dealLinkId, { limit, offset });
      if (!mountedRef.current || requestRef.current !== requestID) return;
      setOrders(page.items);
      setTotal(page.total);
    } catch (cause) {
      if (!mountedRef.current || requestRef.current !== requestID) return;
      setError(cause instanceof Error ? cause.message : 'load_failed');
    } finally {
      if (mountedRef.current && requestRef.current === requestID) setLoading(false);
    }
  }, [dealLinkId, enabled, limit, offset]);

  useEffect(() => {
    mountedRef.current = true;
    void reload();
    return () => {
      mountedRef.current = false;
    };
  }, [reload]);

  return useMemo(
    () => ({ orders, total, loading, error, reload }),
    [orders, total, loading, error, reload]
  );
}
