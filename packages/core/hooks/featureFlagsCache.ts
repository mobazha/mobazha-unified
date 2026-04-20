/**
 * Module-level feature flag cache.
 *
 * Shared between the `useFeatureFlags` React hook (UI subscribers) and
 * non-React consumers such as `storefrontContext.getStorefrontHeaders()` —
 * the latter cannot call a hook because it runs inside API-client header
 * assembly on every fetch.
 *
 * Invariants:
 *   - `setCachedFeatureFlags(null)` explicitly invalidates the cache.
 *   - All subscribers are notified synchronously on updates so UI stays
 *     consistent with the next request's outbound headers.
 *   - Writes come from exactly one source: the `useFeatureFlags` fetcher.
 *     Everything else reads only.
 */

import type { FeatureFlags } from '../services/api/serverInfo';
import { featureFlags, type FeatureSnapshot } from '../services/featureFlags';

type Subscriber = (flags: FeatureFlags | null) => void;

let cachedFlags: FeatureFlags | null = null;
const subscribers = new Set<Subscriber>();

/** Retrieve the last fetched flag snapshot. Returns `null` pre-auth or after invalidation. */
export function getCachedFeatureFlags(): FeatureFlags | null {
  return cachedFlags;
}

/**
 * Convert a flat FeatureFlags boolean map (from the login API) into the
 * structured FeatureSnapshot shape that `featureFlags.initialize` expects.
 * This bridges the legacy per-key boolean API with the unified system.
 */
function bridgeToUnifiedFeatureFlags(flags: FeatureFlags | null): void {
  if (!flags) return;
  const snapshot: FeatureSnapshot = {};
  for (const [key, value] of Object.entries(flags)) {
    if (typeof value === 'boolean') {
      snapshot[key] = { effective: value, overridable: [] };
    }
  }
  if (Object.keys(snapshot).length > 0) {
    featureFlags.initialize(snapshot);
  }
}

/** Replace the cache and notify all subscribers. */
export function setCachedFeatureFlags(next: FeatureFlags | null): void {
  cachedFlags = next;
  bridgeToUnifiedFeatureFlags(next);
  for (const sub of subscribers) {
    sub(cachedFlags);
  }
}

/** Subscribe to cache changes. Returns an unsubscribe function. */
export function subscribeFeatureFlags(sub: Subscriber): () => void {
  subscribers.add(sub);
  return () => {
    subscribers.delete(sub);
  };
}
