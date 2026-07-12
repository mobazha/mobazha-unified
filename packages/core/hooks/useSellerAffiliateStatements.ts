// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/** How often to re-poll while a settlement is in flight (planned/submitted) and the tab is visible. */
const POLL_INTERVAL_MS = 12_000;

function hasInFlightSettlement(statements: SellerAffiliateStatementLine[]): boolean {
  return statements.some(
    line => line.settlement?.state === 'planned' || line.settlement?.state === 'submitted'
  );
}

export function useSellerAffiliateStatements(
  audience: SellerAffiliateStatementAudience,
  enabled = true
): UseSellerAffiliateStatementsReturn {
  const [statements, setStatements] = useState<SellerAffiliateStatementLine[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestSequenceRef = useRef(0);
  const inFlightRef = useRef<{
    audience: SellerAffiliateStatementAudience;
    requestID: number;
  } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSequenceRef.current += 1;
      inFlightRef.current = null;
    };
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    if (!enabled) {
      requestSequenceRef.current += 1;
      inFlightRef.current = null;
      setStatements([]);
      setLoading(false);
      return;
    }
    if (inFlightRef.current?.audience === audience) return;
    const requestID = ++requestSequenceRef.current;
    inFlightRef.current = { audience, requestID };
    setLoading(true);
    setError(null);
    try {
      const next = await listSellerAffiliateStatements(audience);
      if (mountedRef.current && requestSequenceRef.current === requestID) setStatements(next);
    } catch (cause) {
      if (mountedRef.current && requestSequenceRef.current === requestID) {
        setStatements([]);
        setError(cause instanceof Error ? cause.message : 'load_failed');
      }
    } finally {
      if (requestSequenceRef.current === requestID) {
        inFlightRef.current = null;
        if (mountedRef.current) setLoading(false);
      }
    }
  }, [audience, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Low-frequency polling while a settlement is planned/submitted and the tab is visible.
  // Pure `pending` lines with no settlement yet never trigger this — there is nothing in
  // flight to wait on, so it would otherwise poll forever.
  useEffect(() => {
    if (!enabled || typeof document === 'undefined' || !hasInFlightSettlement(statements)) {
      return;
    }

    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') void reload();
      }, POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        start();
        void reload();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, statements, reload]);

  return useMemo(
    () => ({ statements, loading, error, reload }),
    [statements, loading, error, reload]
  );
}
