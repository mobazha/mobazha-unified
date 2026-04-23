/**
 * useFeatureFlags — React hook for reading platform-wide feature flags.
 *
 * Design notes:
 *   - Feature flags change rarely within a session (admin-driven toggles).
 *     We cache a single snapshot in module scope, share it across every
 *     consumer, and refresh on demand.
 *   - The underlying endpoint `GET /platform/v1/server/info` requires a JWT.
 *     Pre-auth callers see `flags === null` and `isEnabled(...)` returns false,
 *     which is the intended safe default (features off until we know better).
 *   - No React Query: keeping this hook self-contained avoids a transitive
 *     dependency for code paths that need flags before the QueryClient is
 *     mounted (e.g. bootstrap components).
 *
 * Usage:
 *   const { flags, isEnabled, loading } = useFeatureFlags();
 *   if (isEnabled('multistoreMyStoresUIEnabled', 'killMultistoreReadsDisabled')) { ... }
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getServerInfo,
  isFeatureEnabled as isFeatureEnabledFn,
  type FeatureFlags,
} from '../services/api/serverInfo';
import {
  getCachedFeatureFlags,
  setCachedFeatureFlags,
  subscribeFeatureFlags,
} from './featureFlagsCache';
import { getStoredToken } from '../services/auth/token';

let inflightFetch: Promise<FeatureFlags | null> | null = null;

async function fetchFlags(): Promise<FeatureFlags | null> {
  if (inflightFetch) return inflightFetch;

  // Feature flags live on the SaaS platform endpoint (Casdoor JWT required).
  // Basic-auth sessions (standalone admin AND native/desktop) hold tokens the
  // SaaS backend rejects with 401, which cascades through the global 401
  // interceptor into forceLogout. Skip the network call entirely — basic-auth
  // deployments never need platform-level feature flags.
  if (getStoredToken()?.startsWith('basic:')) {
    setCachedFeatureFlags(null);
    return null;
  }

  inflightFetch = (async () => {
    try {
      const info = await getServerInfo();
      const next: FeatureFlags = info.features ?? {};
      setCachedFeatureFlags(next);
      return next;
    } catch {
      setCachedFeatureFlags(null);
      return null;
    } finally {
      inflightFetch = null;
    }
  })();
  return inflightFetch;
}

/** Drop the cached snapshot (e.g. after admin toggle or user re-login). */
export function invalidateFeatureFlags(): void {
  setCachedFeatureFlags(null);
  inflightFetch = null;
}

export interface UseFeatureFlagsReturn {
  flags: FeatureFlags | null;
  loading: boolean;
  /**
   * Check whether a feature is enabled. The optional `killSwitchKey` argument
   * lets callers honour emergency off-switches without spelling out the
   * two-boolean dance at every call site.
   */
  isEnabled: (key: keyof FeatureFlags, killSwitchKey?: keyof FeatureFlags) => boolean;
  /** Force a refetch (bypasses the module cache). */
  refresh: () => Promise<void>;
}

export function useFeatureFlags(): UseFeatureFlagsReturn {
  const [flags, setFlags] = useState<FeatureFlags | null>(getCachedFeatureFlags());
  const [loading, setLoading] = useState<boolean>(getCachedFeatureFlags() === null);

  useEffect(() => {
    const unsubscribe = subscribeFeatureFlags(next => setFlags(next));

    const cached = getCachedFeatureFlags();
    if (cached === null && !inflightFetch) {
      setLoading(true);
      void fetchFlags().finally(() => setLoading(false));
    } else if (inflightFetch) {
      setLoading(true);
      void inflightFetch.finally(() => setLoading(false));
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const isEnabled = useCallback(
    (key: keyof FeatureFlags, killSwitchKey?: keyof FeatureFlags) =>
      isFeatureEnabledFn(flags, key, killSwitchKey),
    [flags]
  );

  const refresh = useCallback(async () => {
    invalidateFeatureFlags();
    setLoading(true);
    try {
      await fetchFlags();
    } finally {
      setLoading(false);
    }
  }, []);

  return { flags, loading, isEnabled, refresh };
}

export default useFeatureFlags;
