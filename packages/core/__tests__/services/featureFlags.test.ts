/**
 * Unit tests for the unified feature-flag client.
 *
 * Covers Phase B of `HANDOFF_FF_IMPL_API.md`:
 *   - initialize + reset
 *   - isEnabled fail-closed for unknown keys
 *   - snapshot immutability
 *   - subscribe / unsubscribe semantics
 *   - bootstrap from `window.__RUNTIME_CONFIG__.features`
 */

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type FeatureSnapshot, featureFlags } from '../../services/featureFlags';

function runtimeConfig(features: Record<string, unknown>) {
  return {
    schemaVersion: 3,
    authMode: 'hosted',
    deployment: { mode: 'hosted', allowExternalResources: true },
    experience: { kind: 'platform' },
    capabilitiesReady: true,
    features,
    capabilities: {
      commerce: { storefront: true, storeAdmin: true, checkout: true },
      marketplace: {
        discovery: true,
        operator: true,
        selling: true,
        curation: true,
        sellerReview: true,
        customDomains: true,
        releasePublishing: true,
        attribution: true,
      },
      sovereign: { isolatedRuntime: false, managedFleet: false },
      payments: { methods: [] },
    },
  };
}

describe('featureFlags', () => {
  beforeEach(() => {
    featureFlags.reset();
  });

  afterEach(() => {
    featureFlags.reset();
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('accepts a snapshot and marks store as initialized', () => {
      expect(featureFlags.isInitialized()).toBe(false);

      featureFlags.initialize({
        guestCheckout: { effective: true, overridable: ['node_runtime'] },
      });

      expect(featureFlags.isInitialized()).toBe(true);
      expect(featureFlags.isEnabled('guestCheckout')).toBe(true);
    });

    it('drops malformed entries without throwing', () => {
      featureFlags.initialize({
        good: { effective: true, overridable: ['tenant'] },
        // @ts-expect-error — simulating runtime garbage from a legacy backend
        bad: 'not-an-object',
        // @ts-expect-error — null must be rejected too
        emptyValue: null,
      } as unknown as FeatureSnapshot);

      expect(featureFlags.isEnabled('good')).toBe(true);
      expect(featureFlags.getEntry('bad')).toBeUndefined();
      expect(featureFlags.getEntry('emptyValue')).toBeUndefined();
    });

    it('filters unknown scope strings out of overridable', () => {
      featureFlags.initialize({
        x: {
          effective: true,
          // @ts-expect-error — testing runtime robustness
          overridable: ['tenant', 'bogus', 123, 'node_runtime'],
        },
      } as unknown as FeatureSnapshot);

      expect(featureFlags.getEntry('x')?.overridable).toEqual(['tenant', 'node_runtime']);
    });

    it('coerces truthy-but-non-boolean effective values to false', () => {
      featureFlags.initialize({
        // @ts-expect-error — backend should never send "true" but be defensive
        maybe: { effective: 'true', overridable: [] },
      } as unknown as FeatureSnapshot);

      expect(featureFlags.isEnabled('maybe')).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('returns false and warns for unknown keys', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      featureFlags.initialize({
        guestCheckout: { effective: true, overridable: [] },
      });

      expect(featureFlags.isEnabled('missingKey')).toBe(false);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('unknown feature key "missingKey"')
      );
    });

    it('returns the effective boolean for known keys', () => {
      featureFlags.initialize({
        on: { effective: true, overridable: [] },
        off: { effective: false, overridable: [] },
      });

      expect(featureFlags.isEnabled('on')).toBe(true);
      expect(featureFlags.isEnabled('off')).toBe(false);
    });
  });

  describe('isOverridable', () => {
    it('returns true only when scope is registered', () => {
      featureFlags.initialize({
        guestCheckout: {
          effective: true,
          overridable: ['platform_global', 'node_runtime'],
        },
      });

      expect(featureFlags.isOverridable('guestCheckout', 'platform_global')).toBe(true);
      expect(featureFlags.isOverridable('guestCheckout', 'node_runtime')).toBe(true);
      expect(featureFlags.isOverridable('guestCheckout', 'tenant')).toBe(false);
      expect(featureFlags.isOverridable('missing', 'tenant')).toBe(false);
    });
  });

  describe('snapshot', () => {
    it('returns a frozen object', () => {
      featureFlags.initialize({
        x: { effective: true, overridable: ['tenant'] },
      });

      const snap = featureFlags.snapshot();
      expect(Object.isFrozen(snap)).toBe(true);
      expect(Object.isFrozen(snap.x)).toBe(true);
      expect(Object.isFrozen(snap.x.overridable)).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('fires on initialize and unsubscribe stops delivery', () => {
      const listener = vi.fn();
      const unsubscribe = featureFlags.subscribe(listener);

      featureFlags.initialize({
        a: { effective: true, overridable: [] },
      });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      featureFlags.initialize({
        a: { effective: false, overridable: [] },
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('keeps other listeners alive when one throws', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const bad = vi.fn(() => {
        throw new Error('boom');
      });
      const good = vi.fn();

      const unsubBad = featureFlags.subscribe(bad);
      const unsubGood = featureFlags.subscribe(good);

      try {
        featureFlags.initialize({
          a: { effective: true, overridable: [] },
        });

        expect(bad).toHaveBeenCalled();
        expect(good).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalled();
      } finally {
        unsubBad();
        unsubGood();
      }
    });
  });

  describe('initializeFromRuntimeConfig', () => {
    it('reads window.__RUNTIME_CONFIG__.features', () => {
      (window as unknown as { __RUNTIME_CONFIG__: unknown }).__RUNTIME_CONFIG__ = {
        ...runtimeConfig({
          guestCheckout: { effective: true, overridable: ['node_runtime'] },
        }),
      };

      const snap = featureFlags.initializeFromRuntimeConfig();
      expect(snap.guestCheckout?.effective).toBe(true);
      expect(featureFlags.isEnabled('guestCheckout')).toBe(true);

      delete (window as unknown as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__;
    });

    it('uses fail-closed frontend defaults when runtime-config is missing', () => {
      delete (window as unknown as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__;

      const snap = featureFlags.initializeFromRuntimeConfig();
      expect(snap.supplyAvailabilityEnabled).toEqual({
        effective: false,
        overridable: ['platform_global', 'tenant', 'node_runtime'],
      });
      expect(snap.supplyChainEnabled).toEqual({
        effective: false,
        overridable: ['platform_global', 'tenant', 'node_runtime'],
      });
      expect(snap.storefrontsEnabled).toEqual({
        effective: false,
        overridable: ['platform_global', 'tenant', 'node_runtime'],
      });
      // aiWorkspaceEnabled is the one default-ON frontend fallback: the
      // workspace ships enabled even against backends that predate the flag.
      expect(snap.aiWorkspaceEnabled).toEqual({
        effective: true,
        overridable: ['platform_global', 'tenant', 'node_runtime'],
      });
      expect(featureFlags.isInitialized()).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears state and notifies subscribers', () => {
      featureFlags.initialize({
        a: { effective: true, overridable: [] },
      });

      const listener = vi.fn();
      featureFlags.subscribe(listener);

      featureFlags.reset();

      expect(featureFlags.isInitialized()).toBe(false);
      expect(featureFlags.snapshot()).toEqual({});
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
