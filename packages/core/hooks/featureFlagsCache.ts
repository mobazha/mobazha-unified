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
 * Merge server-driven flags into the current unified snapshot (runtime-config
 * baseline + prior overlays). Server values win per key so SaaS toggles stay
 * authoritative without wiping unrelated runtime-config entries.
 */
function bridgeToUnifiedFeatureFlags(flags: FeatureFlags): void {
  const current = featureFlags.snapshot();
  const merged: FeatureSnapshot = {};

  for (const [key, entry] of Object.entries(current)) {
    merged[key] = {
      effective: entry.effective,
      overridable: [...entry.overridable],
    };
  }

  for (const [key, value] of Object.entries(flags)) {
    if (typeof value === 'boolean') {
      merged[key] = {
        effective: value,
        overridable: merged[key]?.overridable ?? [],
      };
    }
  }

  if (Object.keys(merged).length > 0) {
    featureFlags.initialize(merged);
  }
}

/**
 * Re-apply the cached server flags on top of the current unified snapshot.
 *
 * Runtime-config refreshes re-seed the unified store from `rc.features`
 * (node-evaluated, unauthenticated); without this, a refresh landing after
 * the serverInfo fetch silently discards the authenticated SaaS values.
 * Call after any `featureFlags.initializeFromRuntimeConfig(...)` re-seed.
 */
export function reapplyCachedFeatureFlags(): void {
  if (cachedFlags) {
    bridgeToUnifiedFeatureFlags(cachedFlags);
  }
}

/** Replace the cache and notify all subscribers. */
export function setCachedFeatureFlags(next: FeatureFlags | null): void {
  cachedFlags = next;
  if (next) {
    bridgeToUnifiedFeatureFlags(next);
  } else {
    featureFlags.initializeFromRuntimeConfig();
  }
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
