import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getRuntimeConfig,
  getRuntimePaymentCapabilities,
  hasRuntimePaymentCapabilities,
  initializeRuntimeConfig,
  initializeRuntimeConfigFromWindow,
  mergeRuntimeConfig,
  subscribeRuntimeConfig,
  supportsRuntimePaymentKind,
  supportsRuntimePaymentMethod,
} from '../../config/runtimeConfig';

describe('runtimeConfig', () => {
  beforeEach(() => {
    initializeRuntimeConfig({});
    delete (window as unknown as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__;
  });

  it('normalizes a versioned window bootstrap', () => {
    (window as unknown as { __RUNTIME_CONFIG__: unknown }).__RUNTIME_CONFIG__ = {
      schemaVersion: 2,
      authMode: 'standalone',
      features: { guestCheckout: { effective: true, overridable: [] } },
      capabilities: {
        payments: {
          methods: [
            { id: 'BTC', kind: 'crypto', flow: 'address-transfer' },
            { id: 'stripe', kind: 'fiat', flow: 'provider-session' },
            { id: '', kind: 'crypto', flow: 'address-transfer' },
          ],
        },
      },
    };

    const config = initializeRuntimeConfigFromWindow();
    expect(config.schemaVersion).toBe(2);
    expect(getRuntimePaymentCapabilities()).toHaveLength(2);
    expect(supportsRuntimePaymentMethod('btc', 'crypto')).toBe(true);
    expect(supportsRuntimePaymentMethod('STRIPE', 'fiat')).toBe(true);
    expect(supportsRuntimePaymentKind('fiat')).toBe(true);
  });

  it('fails closed for malformed versioned methods', () => {
    initializeRuntimeConfig({
      schemaVersion: 2,
      capabilities: {
        payments: {
          methods: [
            { id: 'BTC', kind: 'unknown', flow: 'address-transfer' },
            { id: 'ETH', kind: 'crypto', flow: 'arbitrary-script' },
          ],
        },
      },
    });

    expect(hasRuntimePaymentCapabilities()).toBe(true);
    expect(getRuntimePaymentCapabilities()).toEqual([]);
    expect(supportsRuntimePaymentKind('crypto')).toBe(false);
  });

  it('merges refreshed backend state without changing bootstrap environment', () => {
    initializeRuntimeConfig({
      schemaVersion: 2,
      authMode: 'hosted',
      saasUrl: 'https://example.test',
      capabilities: { payments: { methods: [] } },
    });

    mergeRuntimeConfig({
      schemaVersion: 2,
      authMode: 'standalone',
      features: { featureA: { effective: true, overridable: [] } },
      capabilities: {
        payments: {
          methods: [{ id: 'LTC', kind: 'crypto', flow: 'address-transfer' }],
        },
      },
    });

    expect(getRuntimeConfig().authMode).toBe('hosted');
    expect(getRuntimeConfig().saasUrl).toBe('https://example.test');
    expect(getRuntimeConfig().features).toHaveProperty('featureA');
    expect(supportsRuntimePaymentMethod('LTC', 'crypto')).toBe(true);
  });

  it('notifies subscribers on initialization and refresh', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRuntimeConfig(listener);
    initializeRuntimeConfig({ schemaVersion: 2 });
    mergeRuntimeConfig({ schemaVersion: 2 });
    unsubscribe();
    initializeRuntimeConfig({});
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
