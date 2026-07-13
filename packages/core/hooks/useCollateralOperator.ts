'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createCollateralOperatorScopeSnapshot,
  isCollateralOperatorScopeStale,
  normalizeCollateralOperatorScopeKey,
  CollateralOperatorScopeChangedError,
  type CollateralOperatorScopeSnapshot,
} from '../collateral/operatorScope';
import {
  resolveCollateralAccountSelection,
  type CollateralAccountBinding,
} from '../collateral/accountBinding';
import type {
  CollateralAccount,
  CollateralAccountOpenInput,
  CollateralCapabilities,
  CollateralFundingInput,
  CollateralFundingTarget,
} from '../collateral/types';
import { collateralApi } from '../services/api/collateral';

export interface UseCollateralOperatorOptions {
  enabled?: boolean;
  collateralID?: string;
  scopeKey?: string | null;
}

function resetPrincipalScopedState(setters: {
  setAccount: (value: CollateralAccount | null) => void;
  setBindingMismatch: (value: boolean) => void;
  setFundingTarget: (value: CollateralFundingTarget | null) => void;
  setError: (value: Error | null) => void;
  setCapabilities: (value: CollateralCapabilities | null) => void;
}) {
  setters.setAccount(null);
  setters.setBindingMismatch(false);
  setters.setFundingTarget(null);
  setters.setError(null);
  setters.setCapabilities(null);
}

export function useCollateralOperator(options: UseCollateralOperatorOptions = {}) {
  const { enabled = true, collateralID, scopeKey } = options;
  const normalizedScopeKey = normalizeCollateralOperatorScopeKey(scopeKey);

  const [capabilities, setCapabilities] = useState<CollateralCapabilities | null>(null);
  const [account, setAccount] = useState<CollateralAccount | null>(null);
  const [bindingMismatch, setBindingMismatch] = useState(false);
  const [fundingTarget, setFundingTarget] = useState<CollateralFundingTarget | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const scopeRef = useRef<CollateralOperatorScopeSnapshot>(
    createCollateralOperatorScopeSnapshot(normalizedScopeKey, enabled)
  );

  scopeRef.current.scopeKey = normalizedScopeKey;
  scopeRef.current.enabled = enabled;

  useLayoutEffect(() => {
    scopeRef.current = createCollateralOperatorScopeSnapshot(
      normalizedScopeKey,
      enabled,
      scopeRef.current.generation + 1
    );
    resetPrincipalScopedState({
      setAccount,
      setBindingMismatch,
      setFundingTarget,
      setError,
      setCapabilities,
    });
    if (!enabled) {
      setLoading(false);
    }
  }, [enabled, normalizedScopeKey]);

  const requireScope = useCallback((): CollateralOperatorScopeSnapshot => {
    const snapshot = { ...scopeRef.current };
    if (!snapshot.enabled) {
      throw new Error('Collateral operator is not available for the current scope.');
    }
    return snapshot;
  }, []);

  const isStale = useCallback((snapshot: CollateralOperatorScopeSnapshot) => {
    return isCollateralOperatorScopeStale(snapshot, scopeRef.current);
  }, []);

  const run = useCallback(
    async <T>(
      snapshot: CollateralOperatorScopeSnapshot,
      operation: () => Promise<T>
    ): Promise<T> => {
      setLoading(true);
      if (!isStale(snapshot)) {
        setError(null);
      }

      try {
        const result = await operation();
        if (isStale(snapshot)) {
          throw new CollateralOperatorScopeChangedError();
        }
        return result;
      } catch (cause) {
        if (isStale(snapshot)) {
          throw new CollateralOperatorScopeChangedError();
        }
        const nextError = cause instanceof Error ? cause : new Error(String(cause));
        setError(nextError);
        throw nextError;
      } finally {
        if (!isStale(snapshot)) {
          setLoading(false);
        }
      }
    },
    [isStale]
  );

  const refreshCapabilities = useCallback(async () => {
    const snapshot = { ...scopeRef.current };
    if (!snapshot.enabled) return null;
    return run(snapshot, async () => {
      const next = await collateralApi.getCapabilities();
      if (!isStale(snapshot)) {
        setCapabilities(next);
      }
      return next;
    });
  }, [isStale, run]);

  const refreshAccount = useCallback(
    async (id = collateralID) => {
      const snapshot = { ...scopeRef.current };
      const normalizedID = id?.trim();
      if (!snapshot.enabled || !normalizedID) return null;
      return run(snapshot, async () => {
        const next = await collateralApi.getAccount(normalizedID);
        if (!isStale(snapshot)) {
          setAccount(next);
          setBindingMismatch(false);
        }
        return next;
      });
    },
    [collateralID, isStale, run]
  );

  const findResourceAccount = useCallback(
    async (binding: CollateralAccountBinding) => {
      const snapshot = { ...scopeRef.current };
      if (!snapshot.enabled || !binding.providerID.trim() || !binding.resourceID.trim()) {
        return null;
      }
      return run(snapshot, async () => {
        const result = await collateralApi.listAccounts({
          providerID: binding.providerID,
          resourceID: binding.resourceID,
        });
        if (isStale(snapshot)) {
          throw new CollateralOperatorScopeChangedError();
        }
        const selection = resolveCollateralAccountSelection(result.items, binding);
        if (selection.status === 'matched') {
          setAccount(selection.account);
          setBindingMismatch(false);
          return selection.account;
        }
        setAccount(null);
        setBindingMismatch(selection.status === 'mismatch');
        return null;
      });
    },
    [isStale, run]
  );

  const openAccount = useCallback(
    async (input: CollateralAccountOpenInput) => {
      const snapshot = requireScope();
      return run(snapshot, async () => {
        const next = await collateralApi.openAccount(input);
        if (!isStale(snapshot)) {
          setAccount(next);
          setBindingMismatch(false);
        }
        return next;
      });
    },
    [isStale, requireScope, run]
  );

  const prepareFundingTarget = useCallback(
    async (id: string, input: CollateralFundingInput) => {
      const snapshot = requireScope();
      return run(snapshot, async () => {
        const next = await collateralApi.prepareFundingTarget(id, input);
        if (!isStale(snapshot)) {
          setFundingTarget(next);
        }
        return next;
      });
    },
    [isStale, requireScope, run]
  );

  const reconcileFunding = useCallback(
    async (id: string) => {
      const snapshot = requireScope();
      return run(snapshot, async () => {
        const next = await collateralApi.reconcileFunding(id);
        if (!isStale(snapshot)) {
          setAccount(next);
          setBindingMismatch(false);
        }
        return next;
      });
    },
    [isStale, requireScope, run]
  );

  useEffect(() => {
    if (!enabled) return;
    void refreshCapabilities().catch(() => undefined);
  }, [enabled, normalizedScopeKey, refreshCapabilities]);

  useEffect(() => {
    if (!enabled || !collateralID?.trim()) return;
    void refreshAccount(collateralID).catch(() => undefined);
  }, [collateralID, enabled, normalizedScopeKey, refreshAccount]);

  return {
    capabilities,
    account,
    bindingMismatch,
    fundingTarget,
    loading,
    error,
    refreshCapabilities,
    refreshAccount,
    findResourceAccount,
    openAccount,
    prepareFundingTarget,
    reconcileFunding,
    clearError: () => setError(null),
  };
}
