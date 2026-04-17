/**
 * React binding for the unified feature-flag client.
 *
 * Uses `useSyncExternalStore` so components re-render automatically when
 * the runtime snapshot is replaced (e.g. test helpers calling
 * `featureFlags.initialize(...)` or a future in-tab hot-reload path).
 *
 * Usage:
 *   const guestCheckout = useFeature('guestCheckout');
 *   if (!guestCheckout) return null;
 *
 * See `FEATURE_FLAG_ARCHITECTURE.md §4.3` for the contract.
 */

import { useSyncExternalStore } from 'react';

import {
  type FeatureScope,
  type FeatureSnapshotEntry,
  featureFlags,
} from '../services/featureFlags';

export type { FeatureScope, FeatureSnapshotEntry };

/**
 * Subscribe to a single feature's effective state. Returns `false` for
 * unknown keys (fail-closed), matching `featureFlags.isEnabled`.
 */
export function useFeature(key: string): boolean {
  return useSyncExternalStore(
    featureFlags.subscribe,
    () => featureFlags.isEnabled(key),
    // SSR fallback: flags aren't available on the server; render as
    // disabled to stay in sync with the client's first paint before
    // hydration reads `window.__RUNTIME_CONFIG__`.
    () => false
  );
}

/**
 * Subscribe to the full snapshot entry. `undefined` when the key is not
 * registered. Useful for Admin UI that needs `overridable` alongside
 * `effective`.
 */
export function useFeatureEntry(key: string): FeatureSnapshotEntry | undefined {
  return useSyncExternalStore(
    featureFlags.subscribe,
    () => featureFlags.getEntry(key),
    () => undefined
  );
}
