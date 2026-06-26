import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { featureFlags } from '../../services/featureFlags';
import { getCachedFeatureFlags, setCachedFeatureFlags } from '../../hooks/featureFlagsCache';

describe('featureFlagsCache', () => {
  beforeEach(() => {
    featureFlags.reset();
    featureFlags.initialize({
      guestCheckout: { effective: true, overridable: ['node_runtime'] },
    });
  });

  afterEach(() => {
    setCachedFeatureFlags(null);
    featureFlags.reset();
    delete (globalThis as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__;
  });

  it('merges server flags without dropping runtime-config baseline keys', () => {
    setCachedFeatureFlags({
      collectiblesHubEnabled: true,
    });

    expect(featureFlags.isEnabled('guestCheckout')).toBe(true);
    expect(featureFlags.isEnabled('collectiblesHubEnabled')).toBe(true);
  });

  it('server values override per-key effective state', () => {
    setCachedFeatureFlags({
      guestCheckout: false,
      collectiblesHubEnabled: true,
    });

    expect(featureFlags.isEnabled('guestCheckout')).toBe(false);
    expect(featureFlags.isEnabled('collectiblesHubEnabled')).toBe(true);
  });

  it('invalidation restores runtime-config baseline and clears API cache', () => {
    (globalThis as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__ = {
      features: {
        guestCheckout: { effective: true, overridable: [] },
      },
    };
    featureFlags.initializeFromRuntimeConfig();

    setCachedFeatureFlags({ collectiblesHubEnabled: true });
    expect(getCachedFeatureFlags()).not.toBeNull();

    setCachedFeatureFlags(null);

    expect(getCachedFeatureFlags()).toBeNull();
    expect(featureFlags.isEnabled('guestCheckout')).toBe(true);
    expect(featureFlags.isEnabled('collectiblesHubEnabled')).toBe(false);
  });
});
