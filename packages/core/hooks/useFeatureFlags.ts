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
 *   if (isEnabled('multistoreMyStoresUI', 'killMultistoreReadsDisabled')) { ... }
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getServerInfo,
  isFeatureEnabled as isFeatureEnabledFn,
  type FeatureFlags,
} from '../services/api/serverInfo';

type Subscriber = (flags: FeatureFlags | null) => void;

// Module-level cache — shared across every component that mounts the hook.
let cachedFlags: FeatureFlags | null = null;
let inflightFetch: Promise<FeatureFlags | null> | null = null;
const subscribers = new Set<Subscriber>();

function notify() {
  for (const sub of subscribers) {
    sub(cachedFlags);
  }
}

async function fetchFlags(): Promise<FeatureFlags | null> {
  if (inflightFetch) return inflightFetch;
  inflightFetch = (async () => {
    try {
      const info = await getServerInfo();
      cachedFlags = info.features ?? {};
      notify();
      return cachedFlags;
    } catch {
      // Swallow: hook semantics are "off by default" when the call fails
      // (typically 401 for unauthenticated sessions). The caller can still
      // observe `loading=false, flags=null` and render accordingly.
      cachedFlags = null;
      notify();
      return null;
    } finally {
      inflightFetch = null;
    }
  })();
  return inflightFetch;
}

/** Drop the cached snapshot (e.g. after admin toggle or user re-login). */
export function invalidateFeatureFlags(): void {
  cachedFlags = null;
  inflightFetch = null;
  notify();
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
  const [flags, setFlags] = useState<FeatureFlags | null>(cachedFlags);
  const [loading, setLoading] = useState<boolean>(cachedFlags === null);

  useEffect(() => {
    const sub: Subscriber = next => setFlags(next);
    subscribers.add(sub);

    if (cachedFlags === null && !inflightFetch) {
      setLoading(true);
      void fetchFlags().finally(() => setLoading(false));
    } else if (inflightFetch) {
      setLoading(true);
      void inflightFetch.finally(() => setLoading(false));
    }

    return () => {
      subscribers.delete(sub);
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
