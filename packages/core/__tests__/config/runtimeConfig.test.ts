// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginRuntimeConfigRefresh,
  failRuntimeConfigRefresh,
  getRuntimeConfig,
  getRuntimeConfigStatus,
  getRuntimePaymentCapabilities,
  hasValidRuntimeShell,
  initializeRuntimeConfig,
  initializeRuntimeConfigFromWindow,
  mergeRuntimeConfig,
  subscribeRuntimeConfig,
  supportsRuntimeCapability,
  supportsRuntimePaymentKind,
  supportsRuntimePaymentMethod,
} from '../../config/runtimeConfig';

function runtimeConfig(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 3,
    authMode: 'hosted',
    deployment: { mode: 'hosted', allowExternalResources: true },
    experience: { kind: 'platform' },
    capabilitiesReady: true,
    features: {},
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
      outpost: { isolatedRuntime: false, managedFleet: false },
      payments: { methods: [] },
    },
    ...overrides,
  };
}

describe('runtimeConfig', () => {
  beforeEach(() => {
    initializeRuntimeConfig(runtimeConfig());
    delete (window as unknown as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__;
  });

  it('normalizes a V3 window bootstrap', () => {
    (window as unknown as { __RUNTIME_CONFIG__: unknown }).__RUNTIME_CONFIG__ = runtimeConfig({
      authMode: 'standalone',
      deployment: { mode: 'standalone', allowExternalResources: true },
      experience: { kind: 'store' },
      features: { guestCheckout: { effective: true, overridable: [] } },
      capabilities: {
        ...runtimeConfig().capabilities,
        payments: {
          methods: [
            { id: 'BTC', kind: 'crypto', flow: 'address-transfer' },
            { id: 'stripe', kind: 'fiat', flow: 'provider-session' },
            { id: '', kind: 'crypto', flow: 'address-transfer' },
          ],
        },
      },
    });

    const config = initializeRuntimeConfigFromWindow();
    expect(config.schemaVersion).toBe(3);
    expect(config.deployment.mode).toBe('standalone');
    expect(config.experience.kind).toBe('store');
    expect(getRuntimePaymentCapabilities()).toHaveLength(2);
    expect(supportsRuntimePaymentMethod('btc', 'crypto')).toBe(true);
    expect(supportsRuntimePaymentMethod('STRIPE', 'fiat')).toBe(true);
    expect(supportsRuntimePaymentKind('fiat')).toBe(true);
  });

  it('fails closed for obsolete or malformed contracts', () => {
    initializeRuntimeConfig({ schemaVersion: 2, outpostMode: true });

    expect(getRuntimeConfig().authMode).toBe('standalone');
    expect(getRuntimeConfig().deployment).toEqual({
      mode: 'standalone',
      allowExternalResources: false,
    });
    expect(getRuntimeConfig().experience.kind).toBe('store');
    expect(getRuntimeConfigStatus()).toBe('invalid');
    expect(hasValidRuntimeShell()).toBe(false);
    expect(getRuntimePaymentCapabilities()).toEqual([]);
    expect(supportsRuntimeCapability('commerce.storefront')).toBe(false);
  });

  it('distinguishes pending refresh from an explicitly disabled capability', () => {
    initializeRuntimeConfig(runtimeConfig({ capabilitiesReady: false }));
    expect(getRuntimeConfigStatus()).toBe('pending');

    beginRuntimeConfigRefresh();
    expect(getRuntimeConfigStatus()).toBe('refreshing');

    failRuntimeConfigRefresh();
    expect(getRuntimeConfigStatus()).toBe('error');
  });

  it('keeps the shell snapshot when a backend refresh is malformed', () => {
    initializeRuntimeConfig(
      runtimeConfig({ experience: { kind: 'marketplace', marketplaceIdentifier: 'cards' } })
    );

    mergeRuntimeConfig({ schemaVersion: 2 });

    expect(getRuntimeConfig().experience).toEqual({
      kind: 'marketplace',
      marketplaceIdentifier: 'cards',
    });
    expect(getRuntimeConfigStatus()).toBe('ready');
  });

  it('projects product capabilities independently from deployment and auth', () => {
    initializeRuntimeConfig(
      runtimeConfig({
        authMode: 'hosted',
        deployment: { mode: 'hosted', allowExternalResources: true },
        experience: { kind: 'marketplace', marketplaceIdentifier: 'm2-wilson' },
      })
    );

    expect(supportsRuntimeCapability('marketplace.discovery')).toBe(true);
    expect(supportsRuntimeCapability('marketplace.operator')).toBe(true);
    expect(supportsRuntimeCapability('outpost.isolatedRuntime')).toBe(false);
    expect(getRuntimeConfig().experience.marketplaceIdentifier).toBe('m2-wilson');
  });

  it('merges backend capabilities without replacing the shell experience', () => {
    initializeRuntimeConfig(
      runtimeConfig({
        experience: { kind: 'marketplace', marketplaceIdentifier: 'cards' },
        brand: { name: 'Cards' },
      })
    );

    mergeRuntimeConfig(
      runtimeConfig({
        experience: { kind: 'platform' },
        features: { featureA: { effective: true, overridable: [] } },
        capabilities: {
          ...runtimeConfig().capabilities,
          payments: {
            methods: [{ id: 'LTC', kind: 'crypto', flow: 'address-transfer' }],
          },
        },
      })
    );

    expect(getRuntimeConfig().experience).toEqual({
      kind: 'marketplace',
      marketplaceIdentifier: 'cards',
    });
    expect(getRuntimeConfig().brand).toEqual({ name: 'Cards' });
    expect(getRuntimeConfig().features).toHaveProperty('featureA');
    expect(supportsRuntimePaymentMethod('LTC', 'crypto')).toBe(true);
  });

  it('notifies subscribers on initialization and refresh', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRuntimeConfig(listener);
    initializeRuntimeConfig(runtimeConfig());
    mergeRuntimeConfig(runtimeConfig());
    unsubscribe();
    initializeRuntimeConfig(runtimeConfig());
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
