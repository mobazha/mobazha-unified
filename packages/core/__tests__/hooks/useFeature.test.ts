/**
 * Contract tests for `useFeature` / `useFeatureEntry`.
 *
 * `packages/core` deliberately does not depend on @testing-library/react
 * (that lives in `packages/ui` and `apps/web`). The hook itself is a
 * 3-line `useSyncExternalStore` wrapper around `featureFlags`, so we
 * verify the contract it relies on:
 *   - `featureFlags.subscribe` fires on every store replacement
 *   - `featureFlags.isEnabled` returns the latest effective value
 *   - `featureFlags.getEntry` reflects the latest snapshot entry
 *
 * Render-based tests live in `apps/web` where the testing library is
 * available; they can import `useFeature` from `@mobazha/core/hooks`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFeature, useFeatureEntry } from '../../hooks/useFeature';
import { featureFlags } from '../../services/featureFlags';

describe('useFeature / useFeatureEntry', () => {
  beforeEach(() => {
    featureFlags.reset();
  });

  afterEach(() => {
    featureFlags.reset();
  });

  it('exposes functions the React runtime can consume', () => {
    expect(typeof useFeature).toBe('function');
    expect(typeof useFeatureEntry).toBe('function');
  });

  it('featureFlags.subscribe delivers updates that the hook would observe', () => {
    featureFlags.initialize({
      guestCheckout: { effective: false, overridable: [] },
    });

    const seen: boolean[] = [];
    const unsubscribe = featureFlags.subscribe(() => {
      seen.push(featureFlags.isEnabled('guestCheckout'));
    });

    featureFlags.initialize({
      guestCheckout: { effective: true, overridable: ['node_runtime'] },
    });
    featureFlags.initialize({
      guestCheckout: { effective: false, overridable: [] },
    });

    unsubscribe();
    expect(seen).toEqual([true, false]);
  });

  it('getEntry mirrors the snapshot entry the hook would return', () => {
    featureFlags.initialize({
      guestCheckout: {
        effective: true,
        overridable: ['platform_global', 'node_runtime'],
      },
    });

    expect(featureFlags.getEntry('guestCheckout')).toEqual({
      effective: true,
      overridable: ['platform_global', 'node_runtime'],
    });
    expect(featureFlags.getEntry('missing')).toBeUndefined();
  });
});
