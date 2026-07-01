// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Hydrates platform feature flags from `GET /platform/v1/server/info` after auth.
 *
 * SaaS sessions use Casdoor JWT; flags are not fully represented in the empty
 * local `runtime-config.js` dev placeholder. This hook runs once per app shell
 * (AuthProvider) so every `useFeature()` consumer — not only Admin routes —
 * sees the same server-driven snapshot.
 *
 * Standalone basic-auth sessions skip the fetch (see `fetchFlags` in
 * `useFeatureFlags.ts`).
 */

import { useEffect, useRef } from 'react';

import { useUserStore } from '../stores/userStore';
import { ensureFeatureFlagsLoaded, invalidateFeatureFlags } from './useFeatureFlags';

/**
 * @param active When false, hydration is paused (e.g. AuthProvider still booting).
 */
export function usePlatformFeatureFlagsHydration(active: boolean): void {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (!active) return;

    if (!isAuthenticated) {
      if (wasAuthenticated.current) {
        invalidateFeatureFlags();
      }
      wasAuthenticated.current = false;
      return;
    }

    wasAuthenticated.current = true;
    void ensureFeatureFlagsLoaded();
  }, [active, isAuthenticated]);
}
